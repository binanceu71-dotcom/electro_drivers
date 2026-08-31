import { UserProfile } from './types';

export function isSuperAdmin(user?: UserProfile | null): boolean {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase().trim();
  const status = String(user.status || '').toLowerCase().trim();
  const email = String(user.email || '').toLowerCase().trim();

  const isMaster = email === 'admin@electrodrivers.ru' || email === 'admin@electrodrivers.xyz' || email === 'superadmin@electrodrivers.ru';
  const hasRole = role === 'superadmin' || role === 'admin';
  const isActive = status === 'active';

  return (isMaster || hasRole) && isActive;
}

export function isAdmin(user?: UserProfile | null): boolean {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase().trim();
  const status = String(user.status || '').toLowerCase().trim();
  const email = String(user.email || '').toLowerCase().trim();

  const isMaster = email === 'admin@electrodrivers.ru' || email === 'admin@electrodrivers.xyz' || email === 'superadmin@electrodrivers.ru';
  const hasRole = role === 'admin' || role === 'superadmin';
  const isActive = status === 'active';

  return (isMaster || hasRole) && isActive;
}

export function isActiveUser(user?: UserProfile | null): boolean {
  if (!user) return false;
  const status = String(user.status || '').toLowerCase().trim();
  return status === 'active';
}
