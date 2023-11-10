import express from 'express';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import { financialClosingValidation } from '../../validations';
import { financialClosingController } from '../../controllers';
import authSession from '../../middlewares/authSession';

const router = express.Router();

router.use(authSession())
  .route('/')
  .post(
    auth('manageFinancialClosings'),
    validate(financialClosingValidation.createFinancialClosing),
    financialClosingController.createFinancialClosing
  )
  .get(
    auth('getFinancialClosings'),
    validate(financialClosingValidation.getFinancialClosings),
    financialClosingController.getFinancialClosings
  );

router.use(authSession())
  .route('/:financialClosingId')
  .get(
    auth('getFinancialClosings'),
    validate(financialClosingValidation.getFinancialClosing),
    financialClosingController.getFinancialClosing
  )
  .patch(
    auth('manageFinancialClosings'),
    validate(financialClosingValidation.updateFinancialClosing),
    financialClosingController.updateFinancialClosing
  )
  .delete(
    auth('manageFinancialClosings'),
    validate(financialClosingValidation.deleteFinancialClosing),
    financialClosingController.deleteFinancialClosing
  );

export default router;

/**
 * @swagger
 * tags:
 *   name: FinancialClosings
 *   description: FinancialClosing management and retrieval
 */

/**
 * @swagger
 * /financialClosings:
 *   post:
 *     summary: Create a financialClosing
 *     description: Only admins can create other financialClosings.
 *     tags: [FinancialClosings]
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
 *                  enum: [financialClosing, admin]
 *             example:
 *               name: fake name
 *               email: fake@example.com
 *               password: password1
 *               role: financialClosing
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/FinancialClosing'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all financialClosings
 *     description: Only admins can retrieve all financialClosings.
 *     tags: [FinancialClosings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: FinancialClosing name
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: FinancialClosing role
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
 *         description: Maximum number of financialClosings
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
 *                     $ref: '#/components/schemas/FinancialClosing'
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
 * /financialClosings/{id}:
 *   get:
 *     summary: Get a financialClosing
 *     description: Logged in financialClosings can fetch only their own financialClosing information. Only admins can fetch other financialClosings.
 *     tags: [FinancialClosings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: FinancialClosing id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/FinancialClosing'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a financialClosing
 *     description: Logged in financialClosings can only update their own information. Only admins can update other financialClosings.
 *     tags: [FinancialClosings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: FinancialClosing id
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
 *                $ref: '#/components/schemas/FinancialClosing'
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
 *     summary: Delete a financialClosing
 *     description: Logged in financialClosings can delete only themselves. Only admins can delete other financialClosings.
 *     tags: [FinancialClosings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: FinancialClosing id
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
