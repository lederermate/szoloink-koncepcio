import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { migrate } from './schema.ts'

const DB_PATH = process.env.DB_PATH ?? resolve(process.cwd(), 'data/szolonaplo.db')

export function openDb(path = DB_PATH): DatabaseSync {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;')
  migrate(db)
  return db
}

export type { Db } from './schema.ts'
