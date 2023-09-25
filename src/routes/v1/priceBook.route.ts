import express from 'express';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import { priceBookValidation } from '../../validations';
import { priceBookController } from '../../controllers';
import authSession from '../../middlewares/authSession';

const router = express.Router();

router.use(authSession())
  .route('/')
  .post(
    auth('managePriceBooks'),
    validate(priceBookValidation.createPriceBook),
    priceBookController.createPriceBook
  )
  .get(
    auth('getPriceBooks'),
    validate(priceBookValidation.getPriceBooks),
    priceBookController.getPriceBooks
  );

router.use(authSession())
  .route('/:priceBookId')
  .get(
    auth('getPriceBooks'),
    validate(priceBookValidation.getPriceBook),
    priceBookController.getPriceBook
  )
  .patch(
    auth('managePriceBooks'),
    validate(priceBookValidation.updatePriceBook),
    priceBookController.updatePriceBook
  )
  .delete(
    auth('managePriceBooks'),
    validate(priceBookValidation.deletePriceBook),
    priceBookController.deletePriceBook
  );

export default router;

/**
 * @swagger
 * tags:
 *   name: PriceBooks
 *   description: PriceBook management and retrieval
 */

/**
 * @swagger
 * /priceBooks:
 *   post:
 *     summary: Create a priceBook
 *     description: Only admins can create other priceBooks.
 *     tags: [PriceBooks]
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
 *                  enum: [priceBook, admin]
 *             example:
 *               name: fake name
 *               email: fake@example.com
 *               password: password1
 *               role: priceBook
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/PriceBook'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all priceBooks
 *     description: Only admins can retrieve all priceBooks.
 *     tags: [PriceBooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: PriceBook name
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: PriceBook role
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
 *         description: Maximum number of priceBooks
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
 *                     $ref: '#/components/schemas/PriceBook'
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
 * /priceBooks/{id}:
 *   get:
 *     summary: Get a priceBook
 *     description: Logged in priceBooks can fetch only their own priceBook information. Only admins can fetch other priceBooks.
 *     tags: [PriceBooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: PriceBook id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/PriceBook'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a priceBook
 *     description: Logged in priceBooks can only update their own information. Only admins can update other priceBooks.
 *     tags: [PriceBooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: PriceBook id
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
 *                $ref: '#/components/schemas/PriceBook'
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
 *     summary: Delete a priceBook
 *     description: Logged in priceBooks can delete only themselves. Only admins can delete other priceBooks.
 *     tags: [PriceBooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: PriceBook id
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
