# Journal App - Backend Wiring (Option A: Vercel-first)

## Setup

1. Create `.env` from `.env.example` and fill values:

```
DATABASE_URL=...
OPENAI_API_KEY=...
OCR_MODEL_ID=gpt-5-mini
BLOB_READ_WRITE_TOKEN=...
HARD_CODED_USER_ID=00000000-0000-0000-0000-000000000001
```

2. Install and generate Prisma client, run migrations:

```
npm install
npx prisma generate
npx prisma migrate dev --name init
```

## Endpoints

- POST `/api/upload-url` (multipart form: file)
  - Headers: `x-user-id` optional; defaults to `HARD_CODED_USER_ID`
  - Returns: `{ url, mediaId }`

- POST `/api/ocr`
  - Body: `{ urls?: string[], mediaIds?: string[] }`
  - Extracts text with Vercel AI SDK using `OCR_MODEL_ID` and stores `OcrResult`

- GET `/api/journal` → list entries (supports `take`, `skip`)
- POST `/api/journal` → `{ title?, content, mediaIds? }`
- GET `/api/journal/[id]`
- PATCH `/api/journal/[id]` → `{ title?, content?, mediaIds? }`
- DELETE `/api/journal/[id]`

- POST `/api/chat`
  - Body: `{ conversationId?, messages: [{ role, content }] }`
  - Streams assistant response and records messages

## Notes
- Storage: Vercel Blob. Ensure `BLOB_READ_WRITE_TOKEN` is configured.
- DB: Neon Postgres. `DATABASE_URL` must have `sslmode=require`.
- AI: Vercel AI SDK with `@ai-sdk/openai` provider.
- Multi-user ready via `x-user-id` or `HARD_CODED_USER_ID`.
