import express from 'express';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import { transactionValidation } from '../../validations';
import { transactionController } from '../../controllers';
import authSession from '../../middlewares/authSession';

const router = express.Router();

router.use(authSession())
  .route('/')
  .get(
    auth('getTransactions'),
    validate(transactionValidation.getTransactions),
    transactionController.getTransactions
  );

router.use(authSession())
  .route('/sell')
  .post(
    auth('createSell'),
    validate(transactionValidation.createSalesPurchase),
    transactionController.createSell
  );

router.use(authSession())
  .route('/purchase')
  .post(
    auth('createPurchase'),
    validate(transactionValidation.createSalesPurchase),
    transactionController.createBuy
  );

router.use(authSession())
  .route('/sales-return')
  .post(
    auth('createSalesReturn'),
    validate(transactionValidation.createSalesPurchaseReturn),
    transactionController.createSalesReturn
  );

router.use(authSession())
  .route('/purchase-return')
  .post(
    auth('createPurchaseReturn'),
    validate(transactionValidation.createSalesPurchaseReturn),
    transactionController.createPurchaseReturn
  );

router.use(authSession())
  .route('/receivable-payment')
  .post(
    auth('createReceivablePayment'),
    validate(transactionValidation.createPayment),
    transactionController.createReceivablePayment
  );

router.use(authSession())
  .route('/debt-payment')
  .post(
    auth('createDebtPayment'),
    validate(transactionValidation.createPayment),
    transactionController.createDebtPayment
  );

router.use(authSession())
  .route('/revenue')
  .post(
    auth('createRevenue'),
    validate(transactionValidation.createLiability),
    transactionController.createRevenue
  );

router.use(authSession())
  .route('/expense')
  .post(
    auth('createExpense'),
    validate(transactionValidation.createLiability),
    transactionController.createExpense
  );

router.use(authSession())
  .route('/journal-entry')
  .post(
    auth('createJournalEntry'),
    validate(transactionValidation.createJournalEntry),
    transactionController.createJournalEntry
  );

router.use(authSession())
  .route('/beginning-balance-stock')
  .post(
    auth('createBeginBalanceStock'),
    validate(transactionValidation.createBeginBalanceStock),
    transactionController.createBeginBalanceStock
  );

router.use(authSession())
  .route('/beginning-balance-debt')
  .post(
    auth('createBeginBalanceDebt'),
    validate(transactionValidation.createBeginBalancePayment),
    transactionController.createBeginBalanceDebt
  );

router.use(authSession())
  .route('/beginning-balance-receivable')
  .post(
    auth('createBeginBalanceReceivable'),
    validate(transactionValidation.createBeginBalancePayment),
    transactionController.createBeginBalanceReceivable
  );

router.use(authSession())
  .route('/stock-opname')
  .post(
    auth('createStockOpname'),
    validate(transactionValidation.createStockOpname),
    transactionController.createStockOpname
  );

router.use(authSession())
  .route('/stock-adjustment')
  .post(
    auth('createStockAdjustment'),
    validate(transactionValidation.createStockAdjustment),
    transactionController.createStockAdjustment
  );

router.use(authSession())
  .route('/generate-number/:transactionType')
  .get(
    auth('getTransactions'),
    validate(transactionValidation.generateTransactionNumber),
    transactionController.generateTransactionNumber,
  );

router.use(authSession())
  .route('/sell/:transactionId')
  .patch(
    auth('updateSell'),
    validate(transactionValidation.updateSalesPurchase),
    transactionController.updateSell
  );

router.use(authSession())
  .route('/purchase/:transactionId')
  .patch(
    auth('updatePurchase'),
    validate(transactionValidation.updateSalesPurchase),
    transactionController.updateBuy
  );

router.use(authSession())
  .route('/sales-return/:transactionId')
  .patch(
    auth('updateSalesReturn'),
    validate(transactionValidation.updateSalesPurchaseReturn),
    transactionController.updateSalesReturn
  );

router.use(authSession())
  .route('/purchase-return/:transactionId')
  .patch(
    auth('updatePurchaseReturn'),
    validate(transactionValidation.updateSalesPurchaseReturn),
    transactionController.updatePurchaseReturn
  );

router.use(authSession())
  .route('/receivable-payment/:transactionId')
  .patch(
    auth('updateReceivablePayment'),
    validate(transactionValidation.updatePayment),
    transactionController.updateReceivablePayment
  );

router.use(authSession())
  .route('/debt-payment/:transactionId')
  .patch(
    auth('updateDebtPayment'),
    validate(transactionValidation.updatePayment),
    transactionController.updateDebtPayment
  );

router.use(authSession())
  .route('/revenue/:transactionId')
  .patch(
    auth('updateRevenue'),
    validate(transactionValidation.updateLiability),
    transactionController.updateRevenue
  );

router.use(authSession())
  .route('/expense/:transactionId')
  .patch(
    auth('updateExpense'),
    validate(transactionValidation.updateLiability),
    transactionController.updateExpense
  );

router.use(authSession())
  .route('/journal-entry/:transactionId')
  .patch(
    auth('updateJournalEntry'),
    validate(transactionValidation.updateJournalEntry),
    transactionController.updateJournalEntry
  );

router.use(authSession())
  .route('/beginning-balance-stock/:transactionId')
  .patch(
    auth('updateBeginBalanceStock'),
    validate(transactionValidation.updateBeginBalanceStock),
    transactionController.updateBeginBalanceStock
  );

router.use(authSession())
  .route('/beginning-balance-debt/:transactionId')
  .patch(
    auth('updateBeginBalanceDebt'),
    validate(transactionValidation.updateBeginBalancePayment),
    transactionController.updateBeginBalanceDebt
  );

router.use(authSession())
  .route('/beginning-balance-receivable/:transactionId')
  .patch(
    auth('updateBeginBalanceReceivable'),
    validate(transactionValidation.updateBeginBalancePayment),
    transactionController.updateBeginBalanceReceivable
  );

router.use(authSession())
  .route('/stock-opname/:transactionId')
  .patch(
    auth('updateStockOpname'),
    validate(transactionValidation.updateStockOpname),
    transactionController.updateStockOpname
  );

router.use(authSession())
  .route('/:transactionId')
  .get(
    auth('getTransactions'),
    validate(transactionValidation.getTransaction),
    transactionController.getTransaction
  )
  .delete(
    auth('manageTransactions'),
    validate(transactionValidation.deleteTransaction),
    transactionController.deleteTransaction
  );

router.use(authSession())
  .route('/cash-register/stand-by')
  .get(
    auth('getTransactions'),
    transactionController.getCashRegistersStandBy
  );

router.use(authSession())
  .route('/cash-register/last-balance')
  .get(
    auth('getTransactions'),
    transactionController.getLastBalanceCashRegister
  );

router.use(authSession())
  .route('/payment-draft/:type/:peopleId')
  .get(
    auth('getPaymentDraft'),
    validate(transactionValidation.getPaymentDraft),
    transactionController.getPaymentDraft
  );

router.use(authSession())
  .route('/cash-register/open')
  .post(
    auth('openCashRegister'),
    validate(transactionValidation.openCashRegister),
    transactionController.openCashRegister
  );

router.use(authSession())
  .route('/cash-register/close')
  .post(
    auth('closeCashRegister'),
    validate(transactionValidation.closeCashRegister),
    transactionController.closeCashRegister
  );

export default router;

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Transaction management and retrieval
 */

/**
 * @swagger
 * /transactions:
 *   post:
 *     summary: Create a transaction
 *     description: Only admins can create other transactions.
 *     tags: [Transactions]
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
 *                  enum: [transaction, admin]
 *             example:
 *               name: fake name
 *               email: fake@example.com
 *               password: password1
 *               role: transaction
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Transaction'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all transactions
 *     description: Only admins can retrieve all transactions.
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Transaction name
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Transaction role
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
 *         description: Maximum number of transactions
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
 *                     $ref: '#/components/schemas/Transaction'
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
 * /transactions/{id}:
 *   get:
 *     summary: Get a transaction
 *     description: Logged in transactions can fetch only their own transaction information. Only admins can fetch other transactions.
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/Transaction'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a transaction
 *     description: Logged in transactions can only update their own information. Only admins can update other transactions.
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction id
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
 *                $ref: '#/components/schemas/Transaction'
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
 *     summary: Delete a transaction
 *     description: Logged in transactions can delete only themselves. Only admins can delete other transactions.
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction id
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
