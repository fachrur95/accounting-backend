import express from 'express';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import { dashboardValidation } from '../../validations';
import { dashboardController } from '../../controllers';
import authSession from '../../middlewares/authSession';

const router = express.Router();

router.use(authSession())
  .route('/transaction-daily/:type/:startDate/:endDate')
  .get(
    auth('getTransactionDaily'),
    validate(dashboardValidation.getTransactionDaily),
    dashboardController.getTransactionDaily
  );

router.use(authSession())
  .route('/transaction-monthly/:type/:startDate/:endDate')
  .get(
    auth('getTransactionMonthly'),
    validate(dashboardValidation.getTransactionMonthly),
    dashboardController.getTransactionMonthly
  );

router.use(authSession())
  .route('/debt-receivable-total/:type/:startDate/:endDate')
  .get(
    auth('getDebtReceivableTotal'),
    validate(dashboardValidation.getDebtReceivableTotal),
    dashboardController.getDebtReceivableTotal
  );

router.use(authSession())
  .route('/income/:startDate/:endDate')
  .get(
    auth('getDashboardIncome'),
    validate(dashboardValidation.getIncome),
    dashboardController.getIncome
  );

router.use(authSession())
  .route('/expense/:startDate/:endDate')
  .get(
    auth('getDashboardExpense'),
    validate(dashboardValidation.getExpense),
    dashboardController.getExpense
  );

router.use(authSession())
  .route('/profit-loss/:startDate/:endDate')
  .get(
    auth('getDashboardProfitLoss'),
    validate(dashboardValidation.getProfitLoss),
    dashboardController.getProfitLoss
  );

export default router;

/**
 * @swagger
 * tags:
 *   name: Dashboards
 *   description: Dashboard management and retrieval
 */

/**
 * @swagger
 * /dashboards:
 *   post:
 *     summary: Create a dashboard
 *     description: Only admins can create other dashboards.
 *     tags: [Dashboards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *                 description: must be unique
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: At least one number and one letter
 *               role:
 *                  type: string
 *                  enum: [dashboard, admin]
 *             example:
 *               name: fake name
 *               email: fake@example.com
 *               password: password1
 *               role: dashboard
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Dashboard'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all dashboards
 *     description: Only admins can retrieve all dashboards.
 *     tags: [Dashboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Dashboard name
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Dashboard role
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: sort by query in the form of field:desc/asc (ex. name:asc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of dashboards
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Dashboard'
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *                 totalResults:
 *                   type: integer
 *                   example: 1
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /dashboards/{id}:
 *   get:
 *     summary: Get a dashboard
 *     description: Logged in dashboards can fetch only their own dashboard information. Only admins can fetch other dashboards.
 *     tags: [Dashboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Dashboard id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Dashboard'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a dashboard
 *     description: Logged in dashboards can only update their own information. Only admins can update other dashboards.
 *     tags: [Dashboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Dashboard id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *                 description: must be unique
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: At least one number and one letter
 *             example:
 *               name: fake name
 *               email: fake@example.com
 *               password: password1
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Dashboard'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Delete a dashboard
 *     description: Logged in dashboards can delete only themselves. Only admins can delete other dashboards.
 *     tags: [Dashboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Dashboard id
 *     responses:
 *       "200":
 *         description: No content
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
