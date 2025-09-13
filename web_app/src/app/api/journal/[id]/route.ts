import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { journalUpdateSchema } from '@/lib/validation'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const item = await prisma.journalEntry.findUnique({
      where: { id },
      include: { media: true },
    })
    if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ item })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'failed to fetch entry' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await req.json()
    const parsed = journalUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const updated = await prisma.journalEntry.update({
      where: { id },
      data: {
        title: parsed.data.title ?? undefined,
        content: parsed.data.content ?? undefined,
      },
    })

    if (parsed.data.mediaIds && parsed.data.mediaIds.length > 0) {
      await prisma.media.updateMany({
        where: { journalEntryId: id },
        data: { journalEntryId: null },
      })
      await prisma.media.updateMany({
        where: { id: { in: parsed.data.mediaIds } },
        data: { journalEntryId: id },
      })
    }

    const withMedia = await prisma.journalEntry.findUnique({
      where: { id: updated.id },
      include: { media: true },
    })

    return NextResponse.json({ item: withMedia })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'failed to update entry' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    await prisma.media.updateMany({ where: { journalEntryId: id }, data: { journalEntryId: null } })
    await prisma.journalEntry.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'failed to delete entry' }, { status: 500 })
  }
}
