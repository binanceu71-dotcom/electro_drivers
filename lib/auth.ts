import { NextRequest } from 'next/server';
import { UserProfile, UserRole, UserStatus } from './types';
import { findUserById } from './db';
import { signToken, verifyToken } from './crypto';
export * from './auth-helpers';
export * from './crypto';

export const AUTH_COOKIE_NAME = 'electrodrivers_session';

export function createSessionToken(user: UserProfile): string {
  const payload = {
    uid: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
  };
  return signToken(payload);
}

export function decodeSessionToken(token: string): { uid: string; email: string; role: UserRole; status: UserStatus } | null {
  return verifyToken<{ uid: string; email: string; role: UserRole; status: UserStatus }>(token);
}

export function getSessionFromRequest(req: Request | NextRequest): UserProfile | null {
  let token: string | null = null;
  
  if ('cookies' in req && typeof req.cookies.get === 'function') {
    token = req.cookies.get(AUTH_COOKIE_NAME)?.value || null;
  } else {
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`(?:^|; )${AUTH_COOKIE_NAME}=([^;]*)`));
      if (match) token = match[1];
    }
  }

  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) return null;

  const decoded = decodeSessionToken(token);
  if (!decoded) return null;

  const user = findUserById(decoded.uid);
  if (!user) return null;

  const { password_hash, ...profile } = user;
  return profile;
}
