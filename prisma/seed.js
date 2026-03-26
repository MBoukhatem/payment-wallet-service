const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Read auth_db directly to get seed user IDs
const { Client } = require('pg')

const SEED_EMAILS = ['admin@minipaypal.dev', 'user@minipaypal.dev']

const waitForSeedUsers = async (authDb, retries = 20, delay = 3000) => {
  for (let i = 0; i < retries; i++) {
    const { rows } = await authDb.query(
      `SELECT id FROM "User" WHERE email = ANY($1)`,
      [SEED_EMAILS],
    )
    if (rows.length > 0) return rows
    console.log(`Waiting for seed users in auth_db... (${i + 1}/${retries})`)
    await new Promise((r) => setTimeout(r, delay))
  }
  return []
}

async function main() {
  const walletCount = await prisma.wallet.count()
  if (walletCount > 0) {
    console.log('Wallets already exist, skipping seed.')
    return
  }

  const authDb = new Client({
    connectionString: process.env.DATABASE_URL.replace('/payment_db', '/auth_db'),
  })

  await authDb.connect()
  const rows = await waitForSeedUsers(authDb)
  await authDb.end()

  if (rows.length === 0) {
    console.log('No seed users found in auth_db after waiting, skipping wallet seed.')
    return
  }

  for (const row of rows) {
    await prisma.wallet.create({ data: { userId: row.id } })
    console.log(`Wallet created for user ${row.id}`)
  }

  console.log('Payment seed complete.')
}

main()
  .catch((e) => { console.error('Payment seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
