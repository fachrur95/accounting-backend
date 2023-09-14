import { Role } from '@prisma/client';

const allRoles = {
  [Role.USER]: [],
  [Role.ADMIN]: ['getUsers', 'manageUsers', 'getUnits', 'manageUnits'],
  [Role.SUPERADMIN]: ['getUsers', 'manageUsers', 'getInstitutes', 'manageInstitutes', 'getUnits', 'manageUnits']
};

export const roles = Object.keys(allRoles);
export const roleRights = new Map(Object.entries(allRoles));
