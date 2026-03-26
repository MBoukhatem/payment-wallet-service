const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const walletRoutes = require('./routes/wallet.routes')
const transactionRoutes = require('./routes/transaction.routes')

const app = express()
const PORT = process.env.PORT || 3003

app.use(helmet())
app.use(cors({ origin: true, credentials: true }))

// Stripe webhook needs raw body — must be before express.json()
app.use('/wallet/webhook', express.raw({ type: 'application/json' }))

// JSON parsing for all other routes
app.use(express.json())

// Routes
app.use('/wallet', walletRoutes)
app.use('/transactions', transactionRoutes)

// Internal route (mounted at root for auth service calls)
const { verifyServiceToken } = require('./middlewares/serviceToken.middleware')
const walletController = require('./controllers/wallet.controller')
const { z } = require('zod')
const { validate } = require('./middlewares/validate.middleware')

const createWalletSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
})

app.post(
  '/internal/wallet',
  verifyServiceToken,
  validate(createWalletSchema),
  walletController.createWallet,
)

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'payment', timestamp: new Date().toISOString() })
})

// Error handler
app.use((err, _req, res, _next) => {
  console.error('Payment service error:', err)
  const status = err.status || 500
  res.status(status).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Payment service running on http://localhost:${PORT}`)
})

module.exports = app
