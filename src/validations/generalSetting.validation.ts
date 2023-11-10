import { RecalculateMethod } from '@prisma/client';
import Joi from 'joi';

const updateGeneralSetting = {
  params: Joi.object().keys({
    unitId: Joi.string()
  }),
  body: Joi.object()
    .keys({
      companyName: Joi.string(),
      leader: Joi.string(),
      accountant: Joi.string(),
      recalculateMethod: Joi.string().valid(
        RecalculateMethod.AVG,
        RecalculateMethod.FIFO,
        RecalculateMethod.MANUAL,
      ),
      currentProfitAccountId: Joi.string(),
      debitAccountId: Joi.string(),
      creditAccountId: Joi.string(),
    })
    .min(1)
};

export default {
  updateGeneralSetting,
};
