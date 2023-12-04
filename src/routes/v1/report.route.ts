import express from 'express';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import { reportValidation } from '../../validations';
import { reportController } from '../../controllers';
import authSession from '../../middlewares/authSession';

const router = express.Router();

router.use(authSession())
  .route('/balance-sheet/:startDate/:endDate')
  .get(
    auth('getBalanceSheet'),
    validate(reportValidation.getBalanceSheet),
    reportController.getBalanceSheet
  );

router.use(authSession())
  .route('/balance-sheet/pdf/:startDate/:endDate')
  .get(
    auth('getBalanceSheet'),
    validate(reportValidation.getBalanceSheet),
    reportController.pdfBalanceSheet
  );

router.use(authSession())
  .route('/debt-receivable/:type/:startDate/:endDate')
  .get(
    auth('getDebtReceivable'),
    validate(reportValidation.getDebtReceivable),
    reportController.getDebtReceivable
  );

router.use(authSession())
  .route('/debt-receivable/pdf/:type/:startDate/:endDate')
  .get(
    auth('getDebtReceivable'),
    validate(reportValidation.getDebtReceivable),
    reportController.pdfDebtReceivable
  );

router.use(authSession())
  .route('/profit-loss/:startDate/:endDate')
  .get(
    auth('getProfitLoss'),
    validate(reportValidation.getProfitLoss),
    reportController.getProfitLoss
  );

router.use(authSession())
  .route('/profit-loss/pdf/:startDate/:endDate')
  .get(
    auth('getProfitLoss'),
    validate(reportValidation.getProfitLoss),
    reportController.pdfProfitLoss
  );

router.use(authSession())
  .route('/best-selling-product/pdf/:startDate/:endDate')
  .get(
    auth('getBestSellingProduct'),
    validate(reportValidation.getBestSellingProduct),
    reportController.pdfBestSellingProduct
  );

router.use(authSession())
  .route('/best-selling-product/:startDate/:endDate')
  .get(
    auth('getBestSellingProduct'),
    validate(reportValidation.getBestSellingProduct),
    reportController.getBestSellingProduct
  );

router.use(authSession())
  .route('/cash-flow/:startDate/:endDate')
  .get(
    auth('getCashFlow'),
    validate(reportValidation.getCashFlow),
    reportController.getCashFlow
  );

router.use(authSession())
  .route('/cash-flow/pdf/:startDate/:endDate')
  .get(
    auth('getCashFlow'),
    validate(reportValidation.getCashFlow),
    reportController.pdfCashFlow
  );

router.use(authSession())
  .route('/bank-summary/:startDate/:endDate')
  .get(
    auth('getBankSummary'),
    validate(reportValidation.getBankSummary),
    reportController.getBankSummary
  );

router.use(authSession())
  .route('/bank-summary/pdf/:startDate/:endDate')
  .get(
    auth('getBankSummary'),
    validate(reportValidation.getBankSummary),
    reportController.pdfBankSummary
  );

router.use(authSession())
  .route('/transaction-summary/pdf/:type/:startDate/:endDate')
  .get(
    auth('getTransactionSummary'),
    validate(reportValidation.getTransactionSummary),
    reportController.pdfTransactionSummary
  );

router.use(authSession())
  .route('/transaction-detail/pdf/:type/:startDate/:endDate')
  .get(
    auth('getTransactionDetail'),
    validate(reportValidation.getTransactionDetail),
    reportController.pdfTransactionDetail
  );

router.use(authSession())
  .route('/transaction-detail-grouped/pdf/:type/:startDate/:endDate')
  .get(
    auth('getTransactionDetailGrouped'),
    validate(reportValidation.getTransactionDetailGrouped),
    reportController.pdfTransactionDetailGrouped
  );

router.use(authSession())
  .route('/remaining-stock/pdf/:entryDate')
  .get(
    auth('getRemainingStock'),
    validate(reportValidation.getRemainingStock),
    reportController.pdfRemainingStock
  );

router.use(authSession())
  .route('/stock-card/pdf/:startDate/:endDate')
  .get(
    auth('getStockCard'),
    validate(reportValidation.getStockCard),
    reportController.pdfStockCard
  );

export default router;

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Report management and retrieval
 */

/**
 * @swagger
 * /reports:
 *   post:
 *     summary: Create a report
 *     description: Only admins can create other reports.
 *     tags: [Reports]
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
 *                  enum: [report, admin]
 *             example:
 *               name: fake name
 *               email: fake@example.com
 *               password: password1
 *               role: report
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Report'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all reports
 *     description: Only admins can retrieve all reports.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Report name
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Report role
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
 *         description: Maximum number of reports
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
 *                     $ref: '#/components/schemas/Report'
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
 * /reports/{id}:
 *   get:
 *     summary: Get a report
 *     description: Logged in reports can fetch only their own report information. Only admins can fetch other reports.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Report id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Report'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a report
 *     description: Logged in reports can only update their own information. Only admins can update other reports.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Report id
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
 *                $ref: '#/components/schemas/Report'
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
 *     summary: Delete a report
 *     description: Logged in reports can delete only themselves. Only admins can delete other reports.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Report id
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
