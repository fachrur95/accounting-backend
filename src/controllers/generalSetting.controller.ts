import catchAsync from '../utils/catchAsync';
import { logActivityService, generalSettingService } from '../services';
import { SessionData } from '../types/session';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError';

const updateGeneralSetting = catchAsync(async (req, res) => {
  const user = req.user as Required<SessionData>;
  if (!user.session.unit?.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Unit Must be Required');
  }
  const generalSetting = await generalSettingService.updateGeneralSettingById(user.session.unit.id, {
    ...req.body,
    updatedBy: user.email,
  });
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Update Data General Setting",
    activityType: "UPDATE",
    createdBy: user.email,
    data: JSON.stringify(generalSetting),
  });
  res.send(generalSetting);
});

export default {
  updateGeneralSetting,
};
