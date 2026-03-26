const walletService = require('../services/wallet.service')
const stripeService = require('../services/stripe.service')

const getBalance = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id']
    const result = await walletService.getBalance(userId)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

const deposit = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id']
    const { amount } = req.body
    const result = await walletService.deposit(userId, amount)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

const webhook = async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature']
    const event = stripeService.constructWebhookEvent(req.body, signature)
    await walletService.handleWebhook(event)
    res.json({ received: true })
  } catch (err) {
    console.error('Webhook error:', err.message)
    res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }
}

const confirmDeposit = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id']
    const { paymentIntentId } = req.body
    const result = await walletService.confirmDeposit(userId, paymentIntentId)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

const createWallet = async (req, res, next) => {
  try {
    const { userId } = req.body
    const wallet = await walletService.createWallet(userId)
    res.status(201).json(wallet)
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getBalance,
  deposit,
  confirmDeposit,
  webhook,
  createWallet,
}
