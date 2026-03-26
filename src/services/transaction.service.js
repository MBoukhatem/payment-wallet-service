const prisma = require('../prisma')
const walletRepository = require('../repositories/wallet.repository')
const transactionRepository = require('../repositories/transaction.repository')
const { Decimal } = require('@prisma/client/runtime/library')

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005'
const SERVICE_TOKEN = process.env.SERVICE_TOKEN

const sendMoney = async (senderUserId, receiverUserId, amount) => {
  const senderWallet = await walletRepository.findByUserId(senderUserId)
  if (!senderWallet) {
    const error = new Error('Sender wallet not found')
    error.status = 404
    throw error
  }

  const receiverWallet = await walletRepository.findByUserId(receiverUserId)
  if (!receiverWallet) {
    const error = new Error('Receiver wallet not found')
    error.status = 404
    throw error
  }

  if (senderWallet.id === receiverWallet.id) {
    const error = new Error('Cannot send money to yourself')
    error.status = 400
    throw error
  }

  const sendAmount = new Decimal(amount)

  if (new Decimal(senderWallet.balance).lessThan(sendAmount)) {
    const error = new Error('Insufficient funds')
    error.status = 400
    throw error
  }

  // Atomic transaction
  const transaction = await prisma.$transaction(async (tx) => {
    // Debit sender
    const updatedSender = await tx.wallet.update({
      where: { id: senderWallet.id },
      data: {
        balance: new Decimal(senderWallet.balance).minus(sendAmount),
      },
    })

    // Credit receiver
    await tx.wallet.update({
      where: { id: receiverWallet.id },
      data: {
        balance: new Decimal(receiverWallet.balance).plus(sendAmount),
      },
    })

    // Create transaction record
    const txRecord = await tx.transaction.create({
      data: {
        senderWalletId: senderWallet.id,
        receiverWalletId: receiverWallet.id,
        amount: sendAmount,
        status: 'COMPLETED',
      },
    })

    return { transaction: txRecord, newBalance: updatedSender.balance }
  })

  // Send notification
  try {
    await fetch(`${NOTIFICATION_SERVICE_URL}/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Token': SERVICE_TOKEN,
      },
      body: JSON.stringify({
        to: receiverWallet.userId,
        template: 'transaction',
        data: {
          type: 'received',
          amount: amount.toString(),
          currency: 'EUR',
          fromUserId: senderUserId,
          status: 'completed',
        },
      }),
    })
  } catch (err) {
    console.error('Failed to send transaction notification:', err.message)
  }

  return transaction
}

const getTransactions = async (userId, page, limit) => {
  const wallet = await walletRepository.findByUserId(userId)
  if (!wallet) {
    const error = new Error('Wallet not found')
    error.status = 404
    throw error
  }

  return transactionRepository.findByWalletId(wallet.id, { page, limit })
}

const getTransaction = async (userId, transactionId) => {
  const wallet = await walletRepository.findByUserId(userId)
  if (!wallet) {
    const error = new Error('Wallet not found')
    error.status = 404
    throw error
  }

  const transaction = await transactionRepository.findById(transactionId)
  if (!transaction) {
    const error = new Error('Transaction not found')
    error.status = 404
    throw error
  }

  if (transaction.senderWalletId !== wallet.id && transaction.receiverWalletId !== wallet.id) {
    const error = new Error('Transaction not found')
    error.status = 404
    throw error
  }

  return transaction
}

module.exports = {
  sendMoney,
  getTransactions,
  getTransaction,
}
