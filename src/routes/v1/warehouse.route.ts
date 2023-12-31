// import express from 'express';
// import auth from '../../middlewares/auth';
// import validate from '../../middlewares/validate';
// import { warehouseValidation } from '../../validations';
// import { warehouseController } from '../../controllers';
// import authSession from '../../middlewares/authSession';

// const router = express.Router();

// router.use(authSession())
//   .route('/')
//   .post(
//     auth('manageWarehouses'),
//     validate(warehouseValidation.createWarehouse),
//     warehouseController.createWarehouse
//   )
//   .get(
//     auth('getWarehouses'),
//     validate(warehouseValidation.getWarehouses),
//     warehouseController.getWarehouses
//   );

// router.use(authSession())
//   .route('/:warehouseId')
//   .get(
//     auth('getWarehouses'),
//     validate(warehouseValidation.getWarehouse),
//     warehouseController.getWarehouse
//   )
//   .patch(
//     auth('manageWarehouses'),
//     validate(warehouseValidation.updateWarehouse),
//     warehouseController.updateWarehouse
//   )
//   .delete(
//     auth('manageWarehouses'),
//     validate(warehouseValidation.deleteWarehouse),
//     warehouseController.deleteWarehouse
//   );

// export default router;

// /**
//  * @swagger
//  * tags:
//  *   name: Warehouses
//  *   description: Warehouse management and retrieval
//  */

// /**
//  * @swagger
//  * /warehouses:
//  *   post:
//  *     summary: Create a warehouse
//  *     description: Only admins can create other warehouses.
//  *     tags: [Warehouses]
//  *     security:
//  *       - bearerAuth: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - name
//  *               - email
//  *               - password
//  *               - role
//  *             properties:
//  *               name:
//  *                 type: string
//  *               email:
//  *                 type: string
//  *                 format: email
//  *                 description: must be unique
//  *               password:
//  *                 type: string
//  *                 format: password
//  *                 minLength: 8
//  *                 description: At least one number and one letter
//  *               role:
//  *                  type: string
//  *                  enum: [warehouse, admin]
//  *             example:
//  *               name: fake name
//  *               email: fake@example.com
//  *               password: password1
//  *               role: warehouse
//  *     responses:
//  *       "201":
//  *         description: Created
//  *         content:
//  *           application/json:
//  *             schema:
//  *                $ref: '#/components/schemas/Warehouse'
//  *       "400":
//  *         $ref: '#/components/responses/DuplicateEmail'
//  *       "401":
//  *         $ref: '#/components/responses/Unauthorized'
//  *       "403":
//  *         $ref: '#/components/responses/Forbidden'
//  *
//  *   get:
//  *     summary: Get all warehouses
//  *     description: Only admins can retrieve all warehouses.
//  *     tags: [Warehouses]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: query
//  *         name: name
//  *         schema:
//  *           type: string
//  *         description: Warehouse name
//  *       - in: query
//  *         name: role
//  *         schema:
//  *           type: string
//  *         description: Warehouse role
//  *       - in: query
//  *         name: sortBy
//  *         schema:
//  *           type: string
//  *         description: sort by query in the form of field:desc/asc (ex. name:asc)
//  *       - in: query
//  *         name: limit
//  *         schema:
//  *           type: integer
//  *           minimum: 1
//  *         default: 10
//  *         description: Maximum number of warehouses
//  *       - in: query
//  *         name: page
//  *         schema:
//  *           type: integer
//  *           minimum: 1
//  *           default: 1
//  *         description: Page number
//  *     responses:
//  *       "200":
//  *         description: OK
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 results:
//  *                   type: array
//  *                   items:
//  *                     $ref: '#/components/schemas/Warehouse'
//  *                 page:
//  *                   type: integer
//  *                   example: 1
//  *                 limit:
//  *                   type: integer
//  *                   example: 10
//  *                 totalPages:
//  *                   type: integer
//  *                   example: 1
//  *                 totalResults:
//  *                   type: integer
//  *                   example: 1
//  *       "401":
//  *         $ref: '#/components/responses/Unauthorized'
//  *       "403":
//  *         $ref: '#/components/responses/Forbidden'
//  */

// /**
//  * @swagger
//  * /warehouses/{id}:
//  *   get:
//  *     summary: Get a warehouse
//  *     description: Logged in warehouses can fetch only their own warehouse information. Only admins can fetch other warehouses.
//  *     tags: [Warehouses]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Warehouse id
//  *     responses:
//  *       "200":
//  *         description: OK
//  *         content:
//  *           application/json:
//  *             schema:
//  *                $ref: '#/components/schemas/Warehouse'
//  *       "401":
//  *         $ref: '#/components/responses/Unauthorized'
//  *       "403":
//  *         $ref: '#/components/responses/Forbidden'
//  *       "404":
//  *         $ref: '#/components/responses/NotFound'
//  *
//  *   patch:
//  *     summary: Update a warehouse
//  *     description: Logged in warehouses can only update their own information. Only admins can update other warehouses.
//  *     tags: [Warehouses]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Warehouse id
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               name:
//  *                 type: string
//  *               email:
//  *                 type: string
//  *                 format: email
//  *                 description: must be unique
//  *               password:
//  *                 type: string
//  *                 format: password
//  *                 minLength: 8
//  *                 description: At least one number and one letter
//  *             example:
//  *               name: fake name
//  *               email: fake@example.com
//  *               password: password1
//  *     responses:
//  *       "200":
//  *         description: OK
//  *         content:
//  *           application/json:
//  *             schema:
//  *                $ref: '#/components/schemas/Warehouse'
//  *       "400":
//  *         $ref: '#/components/responses/DuplicateEmail'
//  *       "401":
//  *         $ref: '#/components/responses/Unauthorized'
//  *       "403":
//  *         $ref: '#/components/responses/Forbidden'
//  *       "404":
//  *         $ref: '#/components/responses/NotFound'
//  *
//  *   delete:
//  *     summary: Delete a warehouse
//  *     description: Logged in warehouses can delete only themselves. Only admins can delete other warehouses.
//  *     tags: [Warehouses]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Warehouse id
//  *     responses:
//  *       "200":
//  *         description: No content
//  *       "401":
//  *         $ref: '#/components/responses/Unauthorized'
//  *       "403":
//  *         $ref: '#/components/responses/Forbidden'
//  *       "404":
//  *         $ref: '#/components/responses/NotFound'
//  */
