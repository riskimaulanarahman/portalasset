import { getStoredUser } from './utils';

export const routePermissions: Record<string, string[]> = {
  '/business-units': ['view-business-units'],
  '/sections': ['view-sections'],
  '/estates': ['view-estates'],
  '/categories': ['view-categories'],
  '/materials': ['view-materials'],
  '/asset-regs': ['view-asset-regs'],
  '/assets': ['view-assets'],
  '/assets/:regId': ['view-assets'],
  '/transactions': ['view-transactions'],
  '/anggotas': ['view-anggotas'],
  '/cost-centers': ['view-cost-centers'],
  '/software': ['view-software'],
  '/manufacturers': ['view-manufacturers'],
  '/asset-types': ['view-asset-types'],
  '/units': ['view-units'],
  '/vendors': ['view-vendors'],
  '/admin/workflows': ['view-approval-workflows'],
  '/admin/users': ['view-users'],
  '/admin/roles': ['view-roles'],
  '/settings': ['edit-settings'],
};

export function getStoredPermissions(): string[] {
  const user = getStoredUser();
  return Array.isArray(user.permissions) ? user.permissions : [];
}

export function hasStoredPermission(permission: string): boolean {
  const user = getStoredUser();
  if (!Array.isArray(user.permissions)) {
    return true;
  }

  return getStoredPermissions().includes(permission);
}

export function hasAnyStoredPermission(permissions?: string[]): boolean {
  if (!permissions?.length) {
    return true;
  }

  const user = getStoredUser();
  if (!Array.isArray(user.permissions)) {
    return true;
  }

  const grantedPermissions = getStoredPermissions();
  return permissions.some((permission) => grantedPermissions.includes(permission));
}
