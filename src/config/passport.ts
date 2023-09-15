import prisma from '../client';
import { Strategy as JwtStrategy, ExtractJwt, VerifyCallback, StrategyOptions } from 'passport-jwt';
import config from './config';
import { TokenType } from '@prisma/client';
import { SessionData } from '../types/session';

const cookieExtractor = (req: { cookies: any; signedCookies: { [x: string]: any; }; }) => {
  let jwt = null
  if (req && req.cookies) {
    jwt = req.signedCookies['jwt']
  }

  return jwt
}

const { fromExtractors, fromAuthHeaderAsBearerToken } = ExtractJwt;

const jwtOptions: StrategyOptions = {
  secretOrKey: config.jwt.secret,
  jwtFromRequest: fromExtractors([cookieExtractor, fromAuthHeaderAsBearerToken()]),
  // jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
  // jwtFromRequest: cookieExtractor,
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
      where: { id: payload.session?.institute ?? "" }
    });
    const unit = await prisma.unit.findUnique({
      where: { id: payload.session?.unit ?? "" }
    });
    const dataSession = { ...user, session: { institute, unit } } as SessionData;
    done(null, dataSession);
  } catch (error) {
    done(error, false);
  }
};

export const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);
