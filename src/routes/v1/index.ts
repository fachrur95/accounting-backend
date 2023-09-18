import express from 'express';
import authRoute from './auth.route';
import userRoute from './user.route';
import instituteRoute from './institute.route';
import unitRoute from './unit.route';
import warehouseRoute from './warehouse.route';
import uploadRoute from './upload.route';
import docsRoute from './docs.route';
import config from '../../config/config';

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute
  },
  {
    path: '/users',
    route: userRoute
  },
  {
    path: '/institutes',
    route: instituteRoute
  },
  {
    path: '/units',
    route: unitRoute
  },
  {
    path: '/warehouses',
    route: warehouseRoute
  },
  {
    path: '/upload',
    route: uploadRoute
  },
];

const devRoutes = [
  // routes available only in development mode
  {
    path: '/docs',
    route: docsRoute
  }
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === 'development') {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

export default router;
