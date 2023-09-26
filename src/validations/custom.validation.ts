import Joi from 'joi';

export const password: Joi.CustomValidator<string> = (value, helpers) => {
  if (value.length < 8) {
    return helpers.error('password must be at least 8 characters');
  }
  if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
    return helpers.error('password must contain at least 1 letter and 1 number');
  }
  return value;
};

export const balance: Joi.CustomValidator<[]> = (array, helpers) => {
  const totalDebit = array.reduce((sum: number, item: { debit: number; }) => sum + (item.debit ?? 0), 0);
  const totalCredit = array.reduce((sum: number, item: { credit: number; }) => sum + (item.credit ?? 0), 0);

  if (totalDebit !== totalCredit) {
    return helpers.error('Total debit dan credit harus sama.');
  }

  return array;
}