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
    'getCashRegisters',
    'manageCashRegisters',
  ],
  [Role.AUDITOR]: [
    'getUsers',
    'manageUsers',
    'getInstitutes',
    'manageInstitutes',
    'getUnits',
    'manageUnits',
    'getWarehouses',
    'manageWarehouses',
    'getAccountClasses',
    'manageAccountClasses',
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
    'getAccountClasses',
    'manageAccountClasses',
    'getAccountSubClasses',
    'manageAccountSubClasses',
    'getChartOfAccounts',
    'manageChartOfAccounts',
    'getPeopleCategories',
    'managePeopleCategories',
    'getPeoples',
    'managePeoples',
    'getUnitOfMeasures',
    'manageUnitOfMeasures',
    'getItemTypes',
    'manageItemTypes',
    'getItemCategories',
    'manageItemCategories',
    'getItems',
    'manageItems',
    'getPriceBooks',
    'managePriceBooks',
    'getTransactions',
    'manageTransactions',
    'getCashRegisters',
    'manageCashRegisters',
  ]
};

export const roles = Object.keys(allRoles);
export const roleRights = new Map(Object.entries(allRoles));
