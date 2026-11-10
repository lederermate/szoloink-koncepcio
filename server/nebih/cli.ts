// Parancssori NÉBIH-eszköz:
//   npm run nebih -- status
//   npm run nebih -- search "Kumulus"
//   npm run nebih -- import "Kumulus" <sorindex>
//   npm run nebih -- resync
import { openDb } from '../db.ts'
import { importHit, resyncAll, search, status } from './client.ts'

const [cmd = 'status', ...rest] = process.argv.slice(2)

if (cmd === 'status') console.log(await status(true))
else if (cmd === 'search') {
  const page = await search(rest.join(' '))
  console.table(page.hits.map(({ query, ...h }) => h))
  if (page.has_more) console.log('Több mint 50 találat — szűkítse a keresést.')
} else if (cmd === 'import') {
  const [q, idx] = rest
  const hit = (await search(q)).hits.find((h) => h.index === Number(idx))
  if (!hit) throw new Error('Nincs ilyen sorindex.')
  const p = await importHit(openDb(), hit)
  console.log(`Importálva: ${p.name} (${p.permit_number}), ${p.uses.length} kultúra`)
} else if (cmd === 'resync') console.log(await resyncAll(openDb(), (d, t, n) => console.log(`${d}/${t} ${n}`)))
else console.log('Használat: status | search <szöveg> | import <szöveg> <sorindex> | resync')
