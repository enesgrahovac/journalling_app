import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { journalCreateSchema } from '@/lib/validation'
import { ensureUser } from '@/lib/user'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || process.env.HARD_CODED_USER_ID
    if (!userId) return NextResponse.json({ error: 'missing user id' }, { status: 400 })

    const { searchParams } = new URL(req.url)
    const take = Math.min(Number(searchParams.get('take') ?? '20'), 100)
    const skip = Math.max(Number(searchParams.get('skip') ?? '0'), 0)

    const items = await prisma.journalEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: { media: true },
    })

    return NextResponse.json({ items })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'failed to list entries' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const providedId = req.headers.get('x-user-id') || undefined
    const userId = await ensureUser(providedId)

    const body = await req.json()
    const parsed = journalCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const entry = await prisma.journalEntry.create({
      data: {
        userId,
        title: parsed.data.title ?? null,
        content: parsed.data.content,
      },
    })

    if (parsed.data.mediaIds && parsed.data.mediaIds.length > 0) {
      await prisma.media.updateMany({
        where: { id: { in: parsed.data.mediaIds }, userId },
        data: { journalEntryId: entry.id },
      })
    }

    const withMedia = await prisma.journalEntry.findUnique({
      where: { id: entry.id },
      include: { media: true },
    })

    return NextResponse.json({ item: withMedia })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'failed to create entry' }, { status: 500 })
  }
}
