const express = require('express')
const { z } = require('zod')
const walletController = require('../controllers/wallet.controller')
const { validate } = require('../middlewares/validate.middleware')
const { verifyServiceToken } = require('../middlewares/serviceToken.middleware')

const router = express.Router()

const depositSchema = z.object({
  amount: z.number().min(1, 'Minimum deposit is 1 EUR'),
})

const createWalletSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
})

const confirmSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
})

router.get('/balance', walletController.getBalance)
router.post('/deposit', validate(depositSchema), walletController.deposit)
router.post('/confirm', validate(confirmSchema), walletController.confirmDeposit)

// Webhook route — raw body is handled in app.js
router.post('/webhook', walletController.webhook)

// Internal route for creating wallets (called by auth service)
router.post(
  '/internal/wallet',
  verifyServiceToken,
  validate(createWalletSchema),
  walletController.createWallet,
)

module.exports = router
