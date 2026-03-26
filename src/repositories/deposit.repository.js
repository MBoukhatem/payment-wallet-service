const prisma = require('../prisma')

const create = async (data) => {
  return prisma.stripeDeposit.create({ data })
}

const findByPaymentIntentId = async (stripePaymentIntentId) => {
  return prisma.stripeDeposit.findUnique({ where: { stripePaymentIntentId } })
}

const updateStatus = async (id, status) => {
  return prisma.stripeDeposit.update({
    where: { id },
    data: { status },
  })
}

module.exports = {
  create,
  findByPaymentIntentId,
  updateStatus,
}
