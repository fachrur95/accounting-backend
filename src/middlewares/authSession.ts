import passport from 'passport';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError';
import { NextFunction, Request, Response } from 'express';
// import { User } from '@prisma/client';
import { SessionData } from '../types/session';

type Params = {
  institute?: boolean,
  unit?: boolean
};

interface IAuthSession {
  (params?: Params): (req: Request, res: Response, next: NextFunction) => Promise<void>
}

const verifyCallback =
  (
    req: any,
    resolve: (value?: unknown) => void,
    reject: (reason?: unknown) => void,
    params: Params,
  ) =>
    async (err: unknown, user: SessionData | false, info: unknown) => {
      if (err || info || !user) {
        return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
      }
      req.user = user;
      if (params.institute === true && !user.session?.institute) {
        return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
      }
      if (params.unit === true && !user.session?.unit) {
        return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
      }

      resolve();
    };

const authSession: IAuthSession = (params) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const institute = params?.institute ?? true;
    const unit = params?.unit ?? true;
    return new Promise((resolve, reject) => {
      passport.authenticate(
        'jwt',
        { session: false },
        verifyCallback(req, resolve, reject, { institute, unit })
      )(req, res, next);
    })
      .then(() => next())
      .catch((err) => next(err));
  };

export default authSession;
