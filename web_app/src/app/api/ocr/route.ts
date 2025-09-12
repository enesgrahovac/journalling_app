import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db'
import { ocrRequestSchema } from '@/lib/validation'
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { ensureUser } from '@/lib/user'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = ocrRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const providedId = req.headers.get('x-user-id') || undefined
    const userId = await ensureUser(providedId)

    const modelId = process.env.OCR_MODEL_ID || 'gpt-5-mini'
    const model = openai(modelId)

    let urls: string[] = []
    if (parsed.data.urls && parsed.data.urls.length > 0) {
      urls = parsed.data.urls
    } else if (parsed.data.mediaIds && parsed.data.mediaIds.length > 0) {
      const media: Array<{ id: string; url: string }> = await prisma.media.findMany({
        where: { id: { in: parsed.data.mediaIds }, userId },
        select: { id: true, url: true },
      })
      if (media.length === 0) return NextResponse.json({ error: 'no media found' }, { status: 404 })
      urls = media.map((m) => m.url)
    }

    const results: Array<{ url: string; text: string }> = []

    for (const url of urls) {
      const response = await streamText({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are an OCR engine. Extract verbatim text from the provided images. Preserve line breaks. Do not add or infer content. Output plain text only.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract verbatim text from this image.' },
              { type: 'image', image: url },
            ],
          },
        ],
      })

      let full = ''
      for await (const delta of response.textStream) {
        full += delta
      }

      results.push({ url, text: full.trim() })
    }

    const persisted = [] as Array<{ mediaId: string; url: string; id: string; text: string }>

    for (const r of results) {
      let media = await prisma.media.findFirst({ where: { url: r.url, userId }, select: { id: true } })
      if (!media) {
        media = await prisma.media.create({
          data: { userId, url: r.url, mimeType: 'image/*', sizeBytes: 0 },
          select: { id: true },
        })
      }

      const rec = await prisma.ocrResult.create({
        data: {
          mediaId: media.id,
          rawText: r.text,
          model: modelId,
        },
      })
      persisted.push({ mediaId: media.id, url: r.url, id: rec.id, text: r.text })
    }

    return NextResponse.json({ results: persisted })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'ocr failed' }, { status: 500 })
  }
}
