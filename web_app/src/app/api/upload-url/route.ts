import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import prisma from '@/lib/db'
import { ensureUser } from '@/lib/user'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'file is required (multipart/form-data)' }, { status: 400 })
    }

    const providedId = req.headers.get('x-user-id') || undefined
    const userId = await ensureUser(providedId)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const result = await put(file.name || 'upload', buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: file.type || 'application/octet-stream',
    })

    const media = await prisma.media.create({
      data: {
        userId,
        url: result.url,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: buffer.length,
      },
    })

    return NextResponse.json({ url: result.url, mediaId: media.id })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'upload failed' }, { status: 500 })
  }
}
