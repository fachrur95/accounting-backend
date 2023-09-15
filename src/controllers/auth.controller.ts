import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import { authService, userService, tokenService, emailService } from '../services';
import exclude from '../utils/exclude';
import { User } from '@prisma/client';
import { CookieOptions } from 'express';
import { SessionData } from '../types/session';

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
  res.cookie(
    'jwt', tokens.access.token, cookieOptions(tokens.access.expires)
  ).status(httpStatus.CREATED).send({ user: userWithoutPassword, tokens });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);
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
  const tokens = await authService.setInstituteSession(req.body.instituteId as string, req.body.refreshToken as string);
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
  const tokens = await authService.setUnitSession({
    instituteId: user.session.institute.id as string,
    unitId: req.body.unitId as string
  }, req.body.refreshToken as string);
  res.cookie(
    'jwt', tokens.access.token, cookieOptions(tokens.access.expires)
  ).send({ ...tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
  await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
  res.status(httpStatus.CREATED).send({ message: "Reset password request has been sent to your email." });
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.query.token as string, req.body.password);
  res.status(httpStatus.ACCEPTED).send({ message: "Password has been reset." });
});

const sendVerificationEmail = catchAsync(async (req, res) => {
  const user = req.user as SessionData;
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(user);
  await emailService.sendVerificationEmail(user.email, verifyEmailToken);
  res.status(httpStatus.CREATED).send({ message: "Email confirmation has been sent." });
});

const verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.query.token as string);
  res.status(httpStatus.ACCEPTED).send({ message: "Email confirmed." });
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
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  userInfo,
};
