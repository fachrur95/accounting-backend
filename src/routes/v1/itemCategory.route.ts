import express from 'express';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import { itemCategoryValidation } from '../../validations';
import { itemCategoryController } from '../../controllers';
import authSession from '../../middlewares/authSession';

const router = express.Router();

router.use(authSession())
  .route('/')
  .post(
    auth('manageItemCategories'),
    validate(itemCategoryValidation.createItemCategory),
    itemCategoryController.createItemCategory
  )
  .get(
    auth('getItemCategories'),
    validate(itemCategoryValidation.getItemCategories),
    itemCategoryController.getItemCategories
  );

router.use(authSession())
  .route('/:itemCategoryId')
  .get(
    auth('getItemCategories'),
    validate(itemCategoryValidation.getItemCategory),
    itemCategoryController.getItemCategory
  )
  .patch(
    auth('manageItemCategories'),
    validate(itemCategoryValidation.updateItemCategory),
    itemCategoryController.updateItemCategory
  )
  .delete(
    auth('manageItemCategories'),
    validate(itemCategoryValidation.deleteItemCategory),
    itemCategoryController.deleteItemCategory
  );

export default router;

/**
 * @swagger
 * tags:
 *   name: ItemCategories
 *   description: ItemCategory management and retrieval
 */

/**
 * @swagger
 * /itemCategories:
 *   post:
 *     summary: Create a itemCategory
 *     description: Only admins can create other itemCategories.
 *     tags: [ItemCategories]
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
 *                  enum: [itemCategory, admin]
 *             example:
 *               name: fake name
 *               email: fake@example.com
 *               password: password1
 *               role: itemCategory
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/ItemCategory'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all itemCategories
 *     description: Only admins can retrieve all itemCategories.
 *     tags: [ItemCategories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: ItemCategory name
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: ItemCategory role
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
 *         description: Maximum number of itemCategories
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
 *                     $ref: '#/components/schemas/ItemCategory'
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
 * /itemCategories/{id}:
 *   get:
 *     summary: Get a itemCategory
 *     description: Logged in itemCategories can fetch only their own itemCategory information. Only admins can fetch other itemCategories.
 *     tags: [ItemCategories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ItemCategory id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/ItemCategory'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a itemCategory
 *     description: Logged in itemCategories can only update their own information. Only admins can update other itemCategories.
 *     tags: [ItemCategories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ItemCategory id
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
 *                $ref: '#/components/schemas/ItemCategory'
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
 *     summary: Delete a itemCategory
 *     description: Logged in itemCategories can delete only themselves. Only admins can delete other itemCategories.
 *     tags: [ItemCategories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ItemCategory id
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
