import prisma from '../client';
import { Strategy as JwtStrategy, ExtractJwt, VerifyCallback } from 'passport-jwt';
import config from './config';
import { TokenType } from '@prisma/client';
import { PayloadData, SessionData } from '../types/session';

const jwtOptions = {
  secretOrKey: config.jwt.secret,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
};

const jwtVerify: VerifyCallback = async (payload, done) => {
  try {
    if (payload.type !== TokenType.ACCESS) {
      throw new Error('Invalid token type');
    }
    const user = await prisma.user.findUnique({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
      where: { id: payload.sub }
    });
    if (!user) {
      return done(null, false);
    }
    const institute = await prisma.institute.findUnique({
      where: { id: payload.session?.institution ?? 0 }
    });
    const unit = await prisma.unit.findUnique({
      where: { id: payload.session?.unit ?? 0 }
    });

    done(null, { ...user, session: { institute, unit } } as SessionData);
  } catch (error) {
    done(error, false);
  }
};

export const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);
