import prisma from '../client';
import { Strategy as JwtStrategy, ExtractJwt, VerifyCallback, StrategyOptions } from 'passport-jwt';
import config from './config';
import { TokenType } from '@prisma/client';
import { ICashRegister, SessionData } from '../types/session';

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

    const getInstitute = prisma.institute.findUnique({
      where: { id: payload.session?.institute ?? "" }
    });
    const getUnit = prisma.unit.findUnique({
      where: { id: payload.session?.unit ?? "" },
      include: {
        generalSetting: true,
      }
    });
    const [institute, unit] = await Promise.all([getInstitute, getUnit]);

    let checkCashRegister: ICashRegister[] = [];
    if (unit) {
      checkCashRegister = await prisma.$queryRaw<ICashRegister[]>`
      SELECT DISTINCT "cashRegisterId" AS "id", cr."name", "Transaction"."id" AS "transactionId", "transactionNumber", "entryDate" AS "openDate", "Transaction"."createdBy" AS "openedBy"
      FROM "Transaction"
      LEFT JOIN "CashRegister" cr ON (cr."id" = "Transaction"."cashRegisterId")
      WHERE "transactionType" = 'OPEN_REGISTER'
      AND "Transaction"."id" NOT IN (SELECT DISTINCT "transactionParentId" FROM "Transaction" close_trans WHERE close_trans."transactionType" = 'CLOSE_REGISTER')
      AND "Transaction"."unitId" = ${unit?.id}
      AND "Transaction"."createdBy" = ${user.email};
    `;
    }

    let cashRegister = null;
    if (checkCashRegister.length > 0) {
      cashRegister = checkCashRegister[0];
    }
    const dataSession = {
      ...user,
      session: {
        institute,
        unit,
        cashRegister
      }
    } as SessionData;
    done(null, dataSession);
  } catch (error) {
    done(error, false);
  }
};

export const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);
