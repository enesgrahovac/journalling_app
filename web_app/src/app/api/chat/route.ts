import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { ensureUser } from '@/lib/user'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const providedId = req.headers.get('x-user-id') || undefined
  const userId = await ensureUser(providedId)

  const body = await req.json()
  const { messages = [], conversationId } = body as {
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
    conversationId?: string
  }

  const modelId = process.env.CHAT_MODEL_ID || process.env.OCR_MODEL_ID || 'gpt-5'
  const model = openai(modelId)

  const convo = conversationId
    ? await prisma.conversation.findUnique({ where: { id: conversationId } })
    : await prisma.conversation.create({ data: { userId } })

  if (!convo) return new Response('conversation not found', { status: 404 })

  // Persist user message
  const last = messages[messages.length - 1]
  if (last && last.role === 'user') {
    await prisma.message.create({
      data: { conversationId: convo.id, role: 'user', content: last.content },
    })
  }

  const systemPrompt =
    'You are Journal Assistant. Be concise and helpful. Use the user\'s journal content on request.'

  const response = await streamText({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    providerOptions: {
      openai: {
        reasoning: { effort: 'medium' },
        verbosity: 'medium',
        reasoningSummary: 'auto',
      },
    },
    onFinish: async ({ text }) => {
      await prisma.message.create({
        data: { conversationId: convo.id, role: 'assistant', content: text },
      })
    },
  })

  return response.toUIMessageStreamResponse({ sendReasoning: true })
}
