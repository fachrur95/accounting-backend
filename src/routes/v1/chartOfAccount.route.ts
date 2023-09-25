import express from 'express';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import { chartOfAccountValidation } from '../../validations';
import { chartOfAccountController } from '../../controllers';
import authSession from '../../middlewares/authSession';

const router = express.Router();

router.use(authSession())
  .route('/')
  .post(
    auth('manageChartOfAccounts'),
    validate(chartOfAccountValidation.createChartOfAccount),
    chartOfAccountController.createChartOfAccount
  )
  .get(
    auth('getChartOfAccounts'),
    validate(chartOfAccountValidation.getChartOfAccounts),
    chartOfAccountController.getChartOfAccounts
  );

router.use(authSession())
  .route('/:chartOfAccountId')
  .get(
    auth('getChartOfAccounts'),
    validate(chartOfAccountValidation.getChartOfAccount),
    chartOfAccountController.getChartOfAccount
  )
  .patch(
    auth('manageChartOfAccounts'),
    validate(chartOfAccountValidation.updateChartOfAccount),
    chartOfAccountController.updateChartOfAccount
  )
  .delete(
    auth('manageChartOfAccounts'),
    validate(chartOfAccountValidation.deleteChartOfAccount),
    chartOfAccountController.deleteChartOfAccount
  );

export default router;

/**
 * @swagger
 * tags:
 *   name: ChartOfAccounts
 *   description: ChartOfAccount management and retrieval
 */

/**
 * @swagger
 * /chartOfAccounts:
 *   post:
 *     summary: Create a chartOfAccount
 *     description: Only admins can create other chartOfAccounts.
 *     tags: [ChartOfAccounts]
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
 *                  enum: [chartOfAccount, admin]
 *             example:
 *               name: fake name
 *               email: fake@example.com
 *               password: password1
 *               role: chartOfAccount
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/ChartOfAccount'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all chartOfAccounts
 *     description: Only admins can retrieve all chartOfAccounts.
 *     tags: [ChartOfAccounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: ChartOfAccount name
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: ChartOfAccount role
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
 *         description: Maximum number of chartOfAccounts
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
 *                     $ref: '#/components/schemas/ChartOfAccount'
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
 * /chartOfAccounts/{id}:
 *   get:
 *     summary: Get a chartOfAccount
 *     description: Logged in chartOfAccounts can fetch only their own chartOfAccount information. Only admins can fetch other chartOfAccounts.
 *     tags: [ChartOfAccounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ChartOfAccount id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/ChartOfAccount'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a chartOfAccount
 *     description: Logged in chartOfAccounts can only update their own information. Only admins can update other chartOfAccounts.
 *     tags: [ChartOfAccounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ChartOfAccount id
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
 *                $ref: '#/components/schemas/ChartOfAccount'
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
 *     summary: Delete a chartOfAccount
 *     description: Logged in chartOfAccounts can delete only themselves. Only admins can delete other chartOfAccounts.
 *     tags: [ChartOfAccounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ChartOfAccount id
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
