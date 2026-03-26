const Stripe = require('stripe')

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const createPaymentIntent = async (amount, metadata = {}) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'eur',
    metadata,
  })

  return paymentIntent
}

const constructWebhookEvent = (rawBody, signature) => {
  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET,
  )
}

module.exports = {
  createPaymentIntent,
  constructWebhookEvent,
}
