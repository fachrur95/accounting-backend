import express from 'express';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import { accountSubClassValidation } from '../../validations';
import { accountSubClassController } from '../../controllers';

const router = express.Router();

router
  .route('/')
  .post(
    auth('manageAccountSubClasses'),
    validate(accountSubClassValidation.createAccountSubClass),
    accountSubClassController.createAccountSubClass
  )
  .get(
    auth('getAccountSubClasses'),
    validate(accountSubClassValidation.getAccountSubClasses),
    accountSubClassController.getAccountSubClasses
  );

router
  .route('/:accountSubClassId')
  .get(
    auth('getAccountSubClasses'),
    validate(accountSubClassValidation.getAccountSubClass),
    accountSubClassController.getAccountSubClass
  )
  .patch(
    auth('manageAccountSubClasses'),
    validate(accountSubClassValidation.updateAccountSubClass),
    accountSubClassController.updateAccountSubClass
  )
  .delete(
    auth('manageAccountSubClasses'),
    validate(accountSubClassValidation.deleteAccountSubClass),
    accountSubClassController.deleteAccountSubClass
  );

export default router;

/**
 * @swagger
 * tags:
 *   name: AccountSubClasses
 *   description: AccountSubClass management and retrieval
 */

/**
 * @swagger
 * /accountSubClasses:
 *   post:
 *     summary: Create a accountSubClass
 *     description: Only admins can create other accountSubClasses.
 *     tags: [AccountSubClasses]
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
 *                  enum: [accountSubClass, admin]
 *             example:
 *               name: fake name
 *               email: fake@example.com
 *               password: password1
 *               role: accountSubClass
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/AccountSubClass'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all accountSubClasses
 *     description: Only admins can retrieve all accountSubClasses.
 *     tags: [AccountSubClasses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: AccountSubClass name
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: AccountSubClass role
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
 *         description: Maximum number of accountSubClasses
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
 *                     $ref: '#/components/schemas/AccountSubClass'
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
 * /accountSubClasses/{id}:
 *   get:
 *     summary: Get a accountSubClass
 *     description: Logged in accountSubClasses can fetch only their own accountSubClass information. Only admins can fetch other accountSubClasses.
 *     tags: [AccountSubClasses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: AccountSubClass id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/AccountSubClass'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a accountSubClass
 *     description: Logged in accountSubClasses can only update their own information. Only admins can update other accountSubClasses.
 *     tags: [AccountSubClasses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: AccountSubClass id
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
 *                $ref: '#/components/schemas/AccountSubClass'
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
 *     summary: Delete a accountSubClass
 *     description: Logged in accountSubClasses can delete only themselves. Only admins can delete other accountSubClasses.
 *     tags: [AccountSubClasses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: AccountSubClass id
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
