import express from 'express';
import authRoute from './auth.route';
import userRoute from './user.route';
import instituteRoute from './institute.route';
import unitRoute from './unit.route';
import warehouseRoute from './warehouse.route';
import accountClassRoute from './accountClass.route';
import accountSubClassRoute from './accountSubClass.route';
import chartOfAccountRoute from './chartOfAccount.route';
import taxRoute from './tax.route';
import peopleRoute from './people.route';
import peopleCategoryRoute from './peopleCategory.route';
import unitOfMeasureRoute from './unitOfMeasure.route';
import itemTypeRoute from './itemType.route';
import itemCategoryRoute from './itemCategory.route';
import itemRoute from './item.route';
import priceBookRoute from './priceBook.route';
import transactionRoute from './transaction.route';
// import uploadRoute from './upload.route';
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
    path: '/account-classes',
    route: accountClassRoute
  },
  {
    path: '/account-sub-classes',
    route: accountSubClassRoute
  },
  {
    path: '/chart-of-accounts',
    route: chartOfAccountRoute
  },
  {
    path: '/taxes',
    route: taxRoute
  },
  {
    path: '/peoples',
    route: peopleRoute
  },
  {
    path: '/people-categories',
    route: peopleCategoryRoute
  },
  {
    path: '/unit-of-measurements',
    route: unitOfMeasureRoute
  },
  {
    path: '/item-types',
    route: itemTypeRoute
  },
  {
    path: '/item-categories',
    route: itemCategoryRoute
  },
  {
    path: '/items',
    route: itemRoute
  },
  {
    path: '/price-books',
    route: priceBookRoute
  },
  {
    path: '/transactions',
    route: transactionRoute
  },
  /* {
    path: '/upload',
    route: uploadRoute
  }, */
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
