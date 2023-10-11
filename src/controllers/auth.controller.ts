import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import { authService, userService, tokenService, emailService, instituteService, unitService, logActivityService, userUnitService } from '../services';
import exclude from '../utils/exclude';
import { User } from '@prisma/client';
import { CookieOptions } from 'express';
import { SessionData } from '../types/session';
import pick from '../utils/pick';
import pickNested from '../utils/pickNested';
import { FiltersType } from '../types/filtering';
import ApiError from '../utils/ApiError';

const cookieOptions = (expires: Date): CookieOptions => {
  return {
    httpOnly: true,
    signed: true,
    expires,
    secure: false //--> SET TO TRUE ON PRODUCTION
  }
}

const register = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await userService.createUser(email, password);
  const userWithoutPassword = exclude(user, ['password', 'createdAt', 'updatedAt']);
  const tokens = await tokenService.generateAuthTokens(user);
  await logActivityService.createLogActivity({
    message: `Create New Register`,
    activityType: "REGISTER",
    createdBy: user.email,
  });
  res.cookie(
    'jwt', tokens.access.token, cookieOptions(tokens.access.expires)
  ).status(httpStatus.CREATED).send({ user: userWithoutPassword, tokens });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);
  await logActivityService.createLogActivity({
    message: `Logged In`,
    activityType: "LOGIN",
    createdBy: user.email,
  });
  res.cookie(
    'jwt', tokens.access.token, cookieOptions(tokens.access.expires)
  ).send({ user, tokens });
});

const logout = catchAsync(async (req, res) => {
  if (!req.signedCookies['jwt']) {
    return res.status(httpStatus.UNAUTHORIZED).send({
      error: 'Invalid jwt'
    })
  }
  /* const user = req.user as SessionData;
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Logged Out`,
    activityType: "LOGOUT",
    createdBy: user.email,
  }); */
  await authService.logout(req.body.refreshToken);
  res
    .clearCookie('jwt')
    .status(httpStatus.OK)
    .send({ message: 'You have logged out' });
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.cookie(
    'jwt', tokens.access.token, cookieOptions(tokens.access.expires)
  ).send({ ...tokens });
});

const setInstitute = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  if (user.role !== "SUPERADMIN" && user.role !== "AUDITOR") {
    const allowed = await userUnitService.checkAllowedInstitute(user.id, req.body.instituteId);
    if (!allowed) {
      throw new ApiError(httpStatus.FORBIDDEN, 'You can not to use this institute. Please contact the administrator to allow you.');
    }
  }
  const tokens = await authService.setInstituteSession(req.body.instituteId as string, req.body.refreshToken as string);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Set Institute with id "${req.body.instituteId}"`,
    activityType: "LOGIN",
    createdBy: user.email,
  });
  res.cookie(
    'jwt', tokens.access.token, cookieOptions(tokens.access.expires)
  ).send({ ...tokens });
});

const setUnit = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  if (!user.session?.institute?.id) {
    return res.status(httpStatus.UNAUTHORIZED).send({
      error: 'Invalid jwt'
    })
  }
  if (user.role !== "SUPERADMIN" && user.role !== "AUDITOR") {
    const allowed = await userUnitService.checkAllowedUnit(user.id, req.body.unitId);
    if (!allowed) {
      throw new ApiError(httpStatus.FORBIDDEN, 'You can not to use this unit. Please contact the administrator to allow you.');
    }
  }
  const tokens = await authService.setUnitSession({
    instituteId: user.session.institute.id as string,
    unitId: req.body.unitId as string
  }, req.body.refreshToken as string);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: `Set Unit with id "${req.body.unitId}"`,
    activityType: "LOGIN",
    createdBy: user.email,
  });
  res.cookie(
    'jwt', tokens.access.token, cookieOptions(tokens.access.expires)
  ).send({ ...tokens });
});

const allowedInstitutes = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const filter = pick(req.query, ['name']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'search']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await instituteService.queryInstitutes(filter, options, user, conditions);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Read All allowed Institute",
    activityType: "READ",
    createdBy: user.email,
  });
  res.send(result);
});

const allowedUnits = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  let filterInstitute: { [x: string]: unknown } = {};
  if (!user.session?.institute) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Choose institute first.');
  }
  if (user.role !== "SUPERADMIN") {
    filterInstitute = {
      instituteId: user.session.institute.id
    }
  }
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Read All allowed Unit",
    activityType: "READ",
    createdBy: user.email,
  });
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'search']);
  const conditions = pickNested(req.query?.filters as FiltersType);
  const result = await unitService.queryUnits({ ...filterInstitute }, options, user, conditions);
  res.send(result);
});

const forgotPassword = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
  await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Request reset password",
    activityType: "RESET_PASSWORD",
    createdBy: user.email,
  });
  res.status(httpStatus.CREATED).send({
    message: "Reset password request has been sent to your email."
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  await authService.resetPassword(req.query.token as string, req.body.password);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Success Reset password",
    activityType: "RESET_PASSWORD",
    createdBy: user.email,
  });
  res.status(httpStatus.ACCEPTED).send({
    message: "Password has been reset."
  });
});

const sendVerificationEmail = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(user);
  await emailService.sendVerificationEmail(user.email, verifyEmailToken);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Request Verify email",
    activityType: "VERIFY_EMAIL",
    createdBy: user.email,
  });
  res.status(httpStatus.CREATED).send({
    message: "Email confirmation has been sent."
  });
});

const verifyEmail = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  await authService.verifyEmail(req.query.token as string);
  await logActivityService.createLogActivity({
    unitId: user.session?.unit?.id,
    message: "Success Verify email",
    activityType: "VERIFY_EMAIL",
    createdBy: user.email,
  });
  res.status(httpStatus.ACCEPTED).send({
    message: "Email confirmed."
  });
});

const userInfo = catchAsync(async (req, res) => {
  const user = req.user as User;
  res.send(user);
})

export default {
  register,
  login,
  logout,
  refreshTokens,
  setInstitute,
  setUnit,
  allowedInstitutes,
  allowedUnits,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  userInfo,
};
