import express from 'express';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import { peopleCategoryValidation } from '../../validations';
import { peopleCategoryController } from '../../controllers';

const router = express.Router();

router
  .route('/')
  .post(
    auth('managePeopleCategories'),
    validate(peopleCategoryValidation.createPeopleCategory),
    peopleCategoryController.createPeopleCategory
  )
  .get(
    auth('getPeopleCategories'),
    validate(peopleCategoryValidation.getPeopleCategories),
    peopleCategoryController.getPeopleCategories
  );

router
  .route('/:peopleCategoryId')
  .get(
    auth('getPeopleCategories'),
    validate(peopleCategoryValidation.getPeopleCategory),
    peopleCategoryController.getPeopleCategory
  )
  .patch(
    auth('managePeopleCategories'),
    validate(peopleCategoryValidation.updatePeopleCategory),
    peopleCategoryController.updatePeopleCategory
  )
  .delete(
    auth('managePeopleCategories'),
    validate(peopleCategoryValidation.deletePeopleCategory),
    peopleCategoryController.deletePeopleCategory
  );

export default router;

/**
 * @swagger
 * tags:
 *   name: PeopleCategories
 *   description: PeopleCategory management and retrieval
 */

/**
 * @swagger
 * /peopleCategories:
 *   post:
 *     summary: Create a peopleCategory
 *     description: Only admins can create other peopleCategories.
 *     tags: [PeopleCategories]
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
 *                  enum: [peopleCategory, admin]
 *             example:
 *               name: fake name
 *               email: fake@example.com
 *               password: password1
 *               role: peopleCategory
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/PeopleCategory'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all peopleCategories
 *     description: Only admins can retrieve all peopleCategories.
 *     tags: [PeopleCategories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: PeopleCategory name
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: PeopleCategory role
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
 *         description: Maximum number of peopleCategories
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
 *                   peoples:
 *                     $ref: '#/components/schemas/PeopleCategory'
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
 * /peopleCategories/{id}:
 *   get:
 *     summary: Get a peopleCategory
 *     description: Logged in peopleCategories can fetch only their own peopleCategory information. Only admins can fetch other peopleCategories.
 *     tags: [PeopleCategories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: PeopleCategory id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/PeopleCategory'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a peopleCategory
 *     description: Logged in peopleCategories can only update their own information. Only admins can update other peopleCategories.
 *     tags: [PeopleCategories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: PeopleCategory id
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
 *                $ref: '#/components/schemas/PeopleCategory'
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
 *     summary: Delete a peopleCategory
 *     description: Logged in peopleCategories can delete only themselves. Only admins can delete other peopleCategories.
 *     tags: [PeopleCategories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: PeopleCategory id
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
