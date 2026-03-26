const walletRepository = require('../repositories/wallet.repository')
const depositRepository = require('../repositories/deposit.repository')
const stripeService = require('./stripe.service')
const { Decimal } = require('@prisma/client/runtime/library')

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005'
const SERVICE_TOKEN = process.env.SERVICE_TOKEN

const createWallet = async (userId) => {
  const existing = await walletRepository.findByUserId(userId)
  if (existing) {
    return existing
  }
  return walletRepository.createWallet(userId)
}

const getBalance = async (userId) => {
  const wallet = await walletRepository.findByUserId(userId)
  if (!wallet) {
    const error = new Error('Wallet not found')
    error.status = 404
    throw error
  }
  return { balance: wallet.balance, walletId: wallet.id }
}

const deposit = async (userId, amount) => {
  const wallet = await walletRepository.findByUserId(userId)
  if (!wallet) {
    const error = new Error('Wallet not found')
    error.status = 404
    throw error
  }

  const paymentIntent = await stripeService.createPaymentIntent(amount, {
    walletId: wallet.id,
    userId,
  })

  await depositRepository.create({
    walletId: wallet.id,
    stripePaymentIntentId: paymentIntent.id,
    amount: new Decimal(amount),
  })

  return { clientSecret: paymentIntent.client_secret }
}

const handleWebhook = async (event) => {
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object
    const depositRecord = await depositRepository.findByPaymentIntentId(paymentIntent.id)

    if (!depositRecord) {
      console.warn(`Deposit not found for PaymentIntent ${paymentIntent.id}`)
      return
    }

    if (depositRecord.status === 'SUCCEEDED') {
      return // Already processed
    }

    const wallet = await walletRepository.findById(depositRecord.walletId)
    const newBalance = new Decimal(wallet.balance).add(new Decimal(depositRecord.amount))

    await walletRepository.updateBalance(wallet.id, newBalance)
    await depositRepository.updateStatus(depositRecord.id, 'SUCCEEDED')

    // Send notification
    try {
      await fetch(`${NOTIFICATION_SERVICE_URL}/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Token': SERVICE_TOKEN,
        },
        body: JSON.stringify({
          to: wallet.userId,
          template: 'transaction',
          data: {
            type: 'deposit',
            amount: depositRecord.amount.toString(),
            currency: 'EUR',
            status: 'succeeded',
          },
        }),
      })
    } catch (err) {
      console.error('Failed to send deposit notification:', err.message)
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object
    const depositRecord = await depositRepository.findByPaymentIntentId(paymentIntent.id)
    if (depositRecord) {
      await depositRepository.updateStatus(depositRecord.id, 'FAILED')
    }
  }
}

const confirmDeposit = async (userId, paymentIntentId) => {
  const depositRecord = await depositRepository.findByPaymentIntentId(paymentIntentId)

  if (!depositRecord) {
    const error = new Error('Deposit not found')
    error.status = 404
    throw error
  }

  if (depositRecord.status === 'SUCCEEDED') {
    const wallet = await walletRepository.findByUserId(userId)
    return { balance: wallet.balance, status: 'already_confirmed' }
  }

  // Verify with Stripe that the payment actually succeeded
  const Stripe = require('stripe')
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

  if (paymentIntent.status !== 'succeeded') {
    const error = new Error('Payment not yet confirmed by Stripe')
    error.status = 400
    throw error
  }

  const wallet = await walletRepository.findById(depositRecord.walletId)
  const newBalance = new Decimal(wallet.balance).add(new Decimal(depositRecord.amount))

  await walletRepository.updateBalance(wallet.id, newBalance)
  await depositRepository.updateStatus(depositRecord.id, 'SUCCEEDED')

  return { balance: newBalance, status: 'confirmed' }
}

module.exports = {
  createWallet,
  getBalance,
  deposit,
  confirmDeposit,
  handleWebhook,
}
