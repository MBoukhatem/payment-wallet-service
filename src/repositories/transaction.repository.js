const prisma = require('../prisma')

const create = async (data) => {
  return prisma.transaction.create({ data })
}

const findById = async (id) => {
  return prisma.transaction.findUnique({
    where: { id },
    include: {
      senderWallet: { select: { userId: true } },
      receiverWallet: { select: { userId: true } },
    },
  })
}

const findByWalletId = async (walletId, { page = 1, limit = 10 }) => {
  const skip = (page - 1) * limit
  const where = {
    OR: [{ senderWalletId: walletId }, { receiverWalletId: walletId }],
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        senderWallet: { select: { userId: true } },
        receiverWallet: { select: { userId: true } },
      },
    }),
    prisma.transaction.count({ where }),
  ])

  return {
    transactions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

const updateStatus = async (id, status) => {
  return prisma.transaction.update({
    where: { id },
    data: { status },
  })
}

module.exports = {
  create,
  findById,
  findByWalletId,
  updateStatus,
}
