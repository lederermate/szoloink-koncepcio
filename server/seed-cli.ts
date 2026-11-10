import { openDb } from './db.ts'
import { seedIfEmpty } from './seed.ts'
import { seedVarieties } from './seed-varieties.ts'

const db = openDb()
seedVarieties(db)
console.log(seedIfEmpty(db) ? 'Bemutató adatok betöltve.' : 'Az adatbázis nem üres, kihagyva.')
