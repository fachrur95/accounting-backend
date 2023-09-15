import { Role } from '@prisma/client';

const allRoles = {
  [Role.USER]: [
    'getInstitutes',
    'getUnits',
    'getWarehouses',
  ],
  [Role.ADMIN]: [
    'getUsers',
    'manageUsers',
    'getUnits',
    'manageUnits',
    'getWarehouses',
    'manageWarehouses',
  ],
  [Role.SUPERADMIN]: [
    'getUsers',
    'manageUsers',
    'getInstitutes',
    'manageInstitutes',
    'getUnits',
    'manageUnits',
    'getWarehouses',
    'manageWarehouses',
  ]
};

export const roles = Object.keys(allRoles);
export const roleRights = new Map(Object.entries(allRoles));
