const express = require('express')
const { z } = require('zod')
const transactionController = require('../controllers/transaction.controller')
const { validate } = require('../middlewares/validate.middleware')

const router = express.Router()

const sendSchema = z.object({
  receiverUserId: z.string().min(1, 'Receiver user ID is required'),
  amount: z.number().min(0.01, 'Minimum amount is 0.01 EUR'),
})

router.post('/send', validate(sendSchema), transactionController.send)
router.get('/', transactionController.getTransactions)
router.get('/:id', transactionController.getTransaction)

module.exports = router
