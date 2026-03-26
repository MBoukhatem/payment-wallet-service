const prisma = require('../prisma')

const createWallet = async (userId) => {
  return prisma.wallet.create({
    data: { userId },
  })
}

const findByUserId = async (userId) => {
  return prisma.wallet.findUnique({ where: { userId } })
}

const findById = async (id) => {
  return prisma.wallet.findUnique({ where: { id } })
}

const updateBalance = async (id, balance) => {
  return prisma.wallet.update({
    where: { id },
    data: { balance },
  })
}

module.exports = {
  createWallet,
  findByUserId,
  findById,
  updateBalance,
}
