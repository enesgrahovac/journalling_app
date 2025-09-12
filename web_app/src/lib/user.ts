import prisma from '@/lib/db'

export async function ensureUser(providedUserId?: string): Promise<string> {
  const userId = providedUserId || process.env.HARD_CODED_USER_ID
  if (!userId) {
    throw new Error('missing user id')
  }
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId },
  })
  return userId
}
