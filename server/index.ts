import express from 'express'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { openDb } from './db.ts'
import { createApp } from './app.ts'
import { seedIfEmpty } from './seed.ts'
import { seedVarieties } from './seed-varieties.ts'

const db = openDb()
if (process.env.SEED !== '0') {
  seedVarieties(db)
  seedIfEmpty(db)
}
const app = createApp(db)

const dist = resolve(process.cwd(), 'dist')
if (process.env.NODE_ENV === 'production' && existsSync(dist)) {
  app.use(express.static(dist))
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(resolve(dist, 'index.html')))
}

const port = Number(process.env.PORT ?? 3001)
app.listen(port, () => console.log(`Szőlőnapló API: http://localhost:${port}/api`))
