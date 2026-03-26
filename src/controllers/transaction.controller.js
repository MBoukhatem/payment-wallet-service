const transactionService = require('../services/transaction.service')

const send = async (req, res, next) => {
  try {
    const senderUserId = req.headers['x-user-id']
    const { receiverUserId, amount } = req.body
    const result = await transactionService.sendMoney(senderUserId, receiverUserId, amount)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

const getTransactions = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id']
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const result = await transactionService.getTransactions(userId, page, limit)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

const getTransaction = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id']
    const transaction = await transactionService.getTransaction(userId, req.params.id)
    res.json(transaction)
  } catch (err) {
    next(err)
  }
}

module.exports = {
  send,
  getTransactions,
  getTransaction,
}
