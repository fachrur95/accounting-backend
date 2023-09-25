import express from 'express';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import { unitOfMeasureValidation } from '../../validations';
import { unitOfMeasureController } from '../../controllers';
import authSession from '../../middlewares/authSession';

const router = express.Router();

router.use(authSession())
  .route('/')
  .post(
    auth('manageUnitOfMeasures'),
    validate(unitOfMeasureValidation.createUnitOfMeasure),
    unitOfMeasureController.createUnitOfMeasure
  )
  .get(
    auth('getUnitOfMeasures'),
    validate(unitOfMeasureValidation.getUnitOfMeasures),
    unitOfMeasureController.getUnitOfMeasures
  );

router.use(authSession())
  .route('/:unitOfMeasureId')
  .get(
    auth('getUnitOfMeasures'),
    validate(unitOfMeasureValidation.getUnitOfMeasure),
    unitOfMeasureController.getUnitOfMeasure
  )
  .patch(
    auth('manageUnitOfMeasures'),
    validate(unitOfMeasureValidation.updateUnitOfMeasure),
    unitOfMeasureController.updateUnitOfMeasure
  )
  .delete(
    auth('manageUnitOfMeasures'),
    validate(unitOfMeasureValidation.deleteUnitOfMeasure),
    unitOfMeasureController.deleteUnitOfMeasure
  );

export default router;

/**
 * @swagger
 * tags:
 *   name: UnitOfMeasures
 *   description: UnitOfMeasure management and retrieval
 */

/**
 * @swagger
 * /unitOfMeasures:
 *   post:
 *     summary: Create a unitOfMeasure
 *     description: Only admins can create other unitOfMeasures.
 *     tags: [UnitOfMeasures]
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
 *                  enum: [unitOfMeasure, admin]
 *             example:
 *               name: fake name
 *               email: fake@example.com
 *               password: password1
 *               role: unitOfMeasure
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/UnitOfMeasure'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all unitOfMeasures
 *     description: Only admins can retrieve all unitOfMeasures.
 *     tags: [UnitOfMeasures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: UnitOfMeasure name
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: UnitOfMeasure role
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
 *         description: Maximum number of unitOfMeasures
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
 *                     $ref: '#/components/schemas/UnitOfMeasure'
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
 * /unitOfMeasures/{id}:
 *   get:
 *     summary: Get a unitOfMeasure
 *     description: Logged in unitOfMeasures can fetch only their own unitOfMeasure information. Only admins can fetch other unitOfMeasures.
 *     tags: [UnitOfMeasures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UnitOfMeasure id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/UnitOfMeasure'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a unitOfMeasure
 *     description: Logged in unitOfMeasures can only update their own information. Only admins can update other unitOfMeasures.
 *     tags: [UnitOfMeasures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UnitOfMeasure id
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
 *                $ref: '#/components/schemas/UnitOfMeasure'
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
 *     summary: Delete a unitOfMeasure
 *     description: Logged in unitOfMeasures can delete only themselves. Only admins can delete other unitOfMeasures.
 *     tags: [UnitOfMeasures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UnitOfMeasure id
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
