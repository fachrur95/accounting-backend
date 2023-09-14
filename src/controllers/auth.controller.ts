import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import { authService, userService, tokenService, emailService } from '../services';
import exclude from '../utils/exclude';
import { User } from '@prisma/client';

const register = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await userService.createUser(email, password);
  const userWithoutPassword = exclude(user, ['password', 'createdAt', 'updatedAt']);
  const tokens = await tokenService.generateAuthTokens(user);
  res.status(httpStatus.CREATED).send({ user: userWithoutPassword, tokens });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);
  res.cookie('jwt', tokens.access.token,
    {
      httpOnly: true,
      signed: true,
      expires: tokens.access.expires,
      secure: false //--> SET TO TRUE ON PRODUCTION
    })
    .send({ user, tokens });
  // res.send({ user, tokens });
});

const logout = catchAsync(async (req, res) => {
  if (!req.cookies['jwt']) {
    res.status(httpStatus.UNAUTHORIZED).send({
      error: 'Invalid jwt'
    })
  }
  await authService.logout(req.body.refreshToken);
  res
    .clearCookie('jwt')
    .status(200)
    .json({
      message: 'You have logged out'
    })
  // res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.cookie('jwt', tokens.access.token,
    {
      httpOnly: true,
      signed: true,
      expires: tokens.access.expires,
      secure: false //--> SET TO TRUE ON PRODUCTION
    })
    .send({ ...tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
  await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.query.token as string, req.body.password);
  res.status(httpStatus.NO_CONTENT).send();
});

const sendVerificationEmail = catchAsync(async (req, res) => {
  const user = req.user as User;
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(user);
  await emailService.sendVerificationEmail(user.email, verifyEmailToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.query.token as string);
  res.status(httpStatus.NO_CONTENT).send();
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
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  userInfo,
};
