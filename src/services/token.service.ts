import jwt from 'jsonwebtoken';
// import moment, { Moment } from 'moment';
import dayjs from 'dayjs';
import httpStatus from 'http-status';
import config from '../config/config';
import userService from './user.service';
import ApiError from '../utils/ApiError';
import { Token, TokenType } from '@prisma/client';
import prisma from '../client';
import { AuthTokensResponse } from '../types/response';
import { Session, PayloadData } from '../types/session';

/**
 * Generate token
 * @param {number} userId
 * @param {dayjs.Dayjs} expires
 * @param {string} type
 * @param {string} [secret]
 * @returns {string}
 */
const generateToken = (
  // userId: number,
  data: PayloadData,
  expires: dayjs.Dayjs,
  type: TokenType,
  secret: string = config.jwt.secret
): string => {
  const { userId, ...rest } = data;
  const payload = {
    // sub: data.userId,
    ...rest,
    sub: userId,
    iat: dayjs().unix(),
    exp: expires.unix(),
    type
  };
  return jwt.sign(payload, secret);
};

/**
 * Save a token
 * @param {string} token
 * @param {number} userId
 * @param {Moment} expires
 * @param {string} type
 * @param {boolean} [blacklisted]
 * @returns {Promise<Token>}
 */
const saveToken = async (
  token: string,
  userId: string,
  expires: dayjs.Dayjs,
  type: TokenType,
  blacklisted = false
): Promise<Token> => {
  const createdToken = prisma.token.create({
    data: {
      token,
      userId: userId,
      expires: expires.toDate(),
      type,
      blacklisted
    }
  });
  return createdToken;
};

/**
 * Verify token and return token doc (or throw an error if it is not valid)
 * @param {string} token
 * @param {string} type
 * @returns {Promise<Token>}
 */
const verifyToken = async (token: string, type: TokenType): Promise<Token> => {
  const payload = jwt.verify(token, config.jwt.secret);
  const userId = String(payload.sub);
  const tokenData = await prisma.token.findFirst({
    where: { token, type, userId, blacklisted: false }
  });
  if (!tokenData) {
    throw new Error('Token not found');
  }
  return tokenData;
};

/**
 * Generate auth tokens
 * @param {User} user
 * @returns {Promise<AuthTokensResponse>}
 */
const generateAuthTokens = async (user: { id: string }, session?: Session): Promise<AuthTokensResponse> => {
  const dataUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, role: true, },
  });
  if (!dataUser) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No users found');
  }
  const payload = {
    userId: user.id,
    name: dataUser.name,
    email: dataUser.email,
    role: dataUser.role,
    image: null,
    session
  };

  const accessTokenExpires = dayjs().add(config.jwt.accessExpirationMinutes, 'minutes');
  const accessToken = generateToken(payload, accessTokenExpires, TokenType.ACCESS);

  const refreshTokenExpires = dayjs().add(config.jwt.refreshExpirationDays, 'days');
  const refreshToken = generateToken(payload, refreshTokenExpires, TokenType.REFRESH);
  await saveToken(refreshToken, user.id, refreshTokenExpires, TokenType.REFRESH);

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate()
    },
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires.toDate()
    }
  };
};

/**
 * Generate reset password token
 * @param {string} email
 * @returns {Promise<string>}
 */
const generateResetPasswordToken = async (email: string): Promise<string> => {
  const user = await userService.getUserByEmail(email);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No users found with this email');
  }
  const expires = dayjs().add(config.jwt.resetPasswordExpirationMinutes, 'minutes');
  const resetPasswordToken = generateToken({ userId: user.id }, expires, TokenType.RESET_PASSWORD);
  await saveToken(resetPasswordToken, user.id, expires, TokenType.RESET_PASSWORD);
  return resetPasswordToken;
};

/**
 * Generate verify email token
 * @param {User} user
 * @returns {Promise<string>}
 */
const generateVerifyEmailToken = async (user: { id: string }): Promise<string> => {
  const expires = dayjs().add(config.jwt.verifyEmailExpirationMinutes, 'minutes');
  const verifyEmailToken = generateToken({ userId: user.id }, expires, TokenType.VERIFY_EMAIL);
  await saveToken(verifyEmailToken, user.id, expires, TokenType.VERIFY_EMAIL);
  return verifyEmailToken;
};

export default {
  generateToken,
  saveToken,
  verifyToken,
  generateAuthTokens,
  generateResetPasswordToken,
  generateVerifyEmailToken
};
