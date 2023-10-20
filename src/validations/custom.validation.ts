import Joi from 'joi';

export const password: Joi.CustomValidator<string> = (value, helpers) => {
  if (value.length < 8) {
    return helpers.message({ custom: 'password must be at least 8 characters' });
    // return helpers.error('password must be at least 8 characters');
  }
  if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
    return helpers.message({ custom: 'password must contain at least 1 letter and 1 number' });
    // return helpers.error('password must contain at least 1 letter and 1 number');
  }
  return value;
};

export const balance: Joi.CustomValidator<[]> = (array, helpers) => {
  const hasInvalidData = array.some((item: { debit: number; credit: number; }) =>
    (item.debit === item.credit) ||
    (item.debit > 0 && item.credit > 0)
  );

  if (hasInvalidData) {
    return helpers.message({ custom: 'Debit dan Credit harus bernilai berbeda dan jika salah satunya bernilai lebih dari 0 maka salah satu yang lainnya harus bernilai 0.' });
    // return helpers.error('Debit dan Credit harus bernilai berbeda dan jika salah satunya bernilai lebih dari 0 maka salah satu yang lainnya harus bernilai 0.');
  }

  const totalDebit = array.reduce((sum: number, item: { debit: number; }) => sum + (item.debit ?? 0), 0);
  const totalCredit = array.reduce((sum: number, item: { credit: number; }) => sum + (item.credit ?? 0), 0);

  if (totalDebit !== totalCredit) {
    return helpers.message({ custom: 'Total debit dan credit harus sama.' });
    // return helpers.error('Total debit dan credit harus sama.');
  }

  return array;
}