import crypto from 'crypto';

const SECRET_KEY = process.env.SESSION_SECRET || 'electrodrivers_master_secret_key_2026_super_secure_auth';

/**
 * Hash a password using PBKDF2 with a random salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `pbkdf2$10000$${salt}$${hash}`;
}

/**
 * Verify password against stored hash (supports both PBKDF2 hashes and legacy dev plain strings)
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !password) return false;

  // If it is a PBKDF2 hash format
  if (storedHash.startsWith('pbkdf2$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 4) return false;
    const iterations = parseInt(parts[1], 10);
    const salt = parts[2];
    const originalHash = parts[3];

    const hashToVerify = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
    
    // Constant-time comparison to prevent timing attacks
    const hashBuffer = Buffer.from(hashToVerify, 'hex');
    const originalBuffer = Buffer.from(originalHash, 'hex');
    if (hashBuffer.length !== originalBuffer.length) return false;
    return crypto.timingSafeEqual(hashBuffer, originalBuffer);
  }

  // Fallback for development/seed plain text matching
  return password === storedHash || password.trim() === storedHash.trim();
}

/**
 * Sign session token with HMAC-SHA256 signature
 */
export function signToken(payload: object): string {
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payloadStr)
    .digest('base64url');
  return `${payloadStr}.${signature}`;
}

/**
 * Verify and decode HMAC-signed session token
 */
export function verifyToken<T = any>(token: string): T | null {
  try {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    
    // Modern signed token: payload.signature
    if (parts.length === 2) {
      const [payloadStr, signature] = parts;
      const expectedSignature = crypto
        .createHmac('sha256', SECRET_KEY)
        .update(payloadStr)
        .digest('base64url');

      const sigBuffer = Buffer.from(signature);
      const expSigBuffer = Buffer.from(expectedSignature);

      if (sigBuffer.length !== expSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, expSigBuffer)) {
        return null;
      }

      const jsonStr = Buffer.from(payloadStr, 'base64url').toString('utf-8');
      const parsed = JSON.parse(jsonStr);

      // Check token expiration
      if (parsed.exp && parsed.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return parsed as T;
    }

    // Legacy unsigned token compatibility
    if (parts.length === 1) {
      const jsonStr = Buffer.from(token, 'base64url').toString('utf-8');
      const parsed = JSON.parse(jsonStr);
      if (parsed.exp && parsed.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }
      return parsed as T;
    }

    return null;
  } catch (err) {
    return null;
  }
}
