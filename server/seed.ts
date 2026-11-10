// Bemutató adatok — kitalált ültetvények és KITALÁLT „DEMO” szerek.
// A demó szerek NEM valós NÉBIH engedélyokiratok; a Szeradatbázis oldalon egy
// kattintással törölhetők, és a valós szereket a NÉBIH-ből kell importálni.
import type { Db } from './schema.ts'
import { addStock, harvests, parcels, saveList, saveProduct, saveSpray, setCollectionItem, setSettings, work } from './repo.ts'
import type { ProductUse } from '../shared/types.ts'

const use = (pest: string, dose_min: number, dose_max: number, dose_unit: string, phi: number, rei: number, max: number | null): ProductUse => ({
  culture: 'szőlő', pest, dose_min, dose_max, dose_unit, phi_days: phi, rei_days: rei, max_treatments: max, notes: null,
})

export function seedIfEmpty(db: Db) {
  const n = db.prepare('SELECT COUNT(*) c FROM parcels').get() as { c: number }
  if (Number(n.c) > 0) return false
  seed(db)
  return true
}

export function seed(db: Db) {
  const P = parcels(db)
  const pl = (variety: string, rows: string | null, vine_count: number, rootstock: string, planted_year: number, notes: string | null = null) => ({ variety, rows, vine_count, rootstock, planted_year, notes })
  // Vegyes ültetvény: a korai Irsai Olivér és a késői Olaszrizling egy parcellán (a permetezés közös, az érés nem!)
  const p1 = P.create({ name: 'Öreg-hegy', hrsz: '0123/4', location: 'Badacsonytomaj', area_ha: 1.2, row_spacing_m: 2.4, vine_spacing_m: 1.0, training_system: 'Középmagas kordon', color: '#65a30d',
    plantings: [pl('Olaszrizling', '1–30. sor', 4100, 'Teleki 5C', 1998), pl('Irsai Olivér', '31–38. sor', 900, 'T.K. 5BB', 2008, 'Pótlás a fagykár után')] })
  const p2 = P.create({ name: 'Kis-dűlő', hrsz: '0456/2', location: 'Badacsonytomaj', area_ha: 0.65, row_spacing_m: 2.2, vine_spacing_m: 0.9, training_system: 'Guyot', color: '#9f1239',
    plantings: [pl('Kékfrankos', null, 3280, 'T.K. 5BB', 2012)] })
  const p3 = P.create({ name: 'Templom alatti', hrsz: '0789/11', location: 'Szigliget', area_ha: 0.9, row_spacing_m: 2.5, vine_spacing_m: 1.0, training_system: 'Ernyő', color: '#d97706',
    plantings: [pl('Szürkebarát', null, 3600, 'SO4', 2005)] })
  // Hobbikert: sok csemegefajta, fajtánként néhány tő — a szoloink.hu tipikus felhasználója
  P.create({ name: 'Házikert (lugas)', location: 'Badacsonytomaj', area_ha: 0.03, training_system: 'Lugas', color: '#7c3aed', notes: 'Csemegeszőlő-gyűjtemény a ház mögött.',
    plantings: [
      pl('Csabagyöngye', 'lugas, bal oldal', 4, 'T.K. 5BB', 2016), pl('Pölöskei muskotály', 'lugas, bal oldal', 3, 'T.K. 5BB', 2016),
      pl('Palatina', 'lugas, jobb oldal', 3, 'Teleki 5C', 2019), pl('Nero', 'kerítés mellett', 2, 'saját gyökerű', 2020, 'Permetezés nélkül tartva'),
      pl('Moldova', 'kerítés mellett', 2, 'Teleki 5C', 2021), pl('Kismis Lucsisztij', 'fólia mellett', 2, 'SO4', 2022),
    ] })

  const demo = { source: 'demo' as const, category: 'III.', permit_valid_until: '2030-12-31', status: 'DEMÓ' }
  const cu = saveProduct(db, { ...demo, name: 'DEMO Réz 50 WG', permit_number: 'DEMO-001', holder: 'Bemutató Kft.', formulation: 'WG', unit: 'kg',
    active_substances: [{ name: 'réz (rézhidroxid formában)', concentration: '50%' }],
    uses: [use('peronoszpóra', 1.5, 2.5, 'kg/ha', 21, 1, 4)] })
  const s = saveProduct(db, { ...demo, name: 'DEMO Kén 80 WG', permit_number: 'DEMO-002', holder: 'Bemutató Kft.', formulation: 'WG', unit: 'kg',
    active_substances: [{ name: 'kén', concentration: '80%' }],
    uses: [use('lisztharmat', 2, 6, 'kg/ha', 5, 0, 8)] })
  const sys = saveProduct(db, { ...demo, name: 'DEMO Felszívódó EC', permit_number: 'DEMO-003', holder: 'Bemutató Kft.', formulation: 'EC', unit: 'l', category: 'II.',
    active_substances: [{ name: 'demo hatóanyag A', concentration: '100 g/l' }],
    uses: [use('peronoszpóra', 0.4, 0.5, 'l/ha', 28, 2, 3), use('lisztharmat', 0.4, 0.5, 'l/ha', 28, 2, 3)] })
  const bot = saveProduct(db, { ...demo, name: 'DEMO Botrytis SC', permit_number: 'DEMO-004', holder: 'Bemutató Kft.', formulation: 'SC', unit: 'l',
    active_substances: [{ name: 'demo hatóanyag B', concentration: '500 g/l' }],
    uses: [use('szürkerothadás', 1, 1.5, 'l/ha', 35, 1, 1)] })
  saveProduct(db, { ...demo, name: 'DEMO Rovarölő (csak alma)', permit_number: 'DEMO-005', holder: 'Bemutató Kft.', formulation: 'EC', unit: 'l',
    active_substances: [{ name: 'demo hatóanyag C', concentration: '25 g/l' }],
    uses: [{ ...use('almamoly', 0.2, 0.3, 'l/ha', 14, 1, 2), culture: 'alma' }] })

  const y = new Date().getFullYear()
  addStock(db, cu.id, 25, `${y}-04-10`, 'Nyitókészlet')
  addStock(db, s.id, 50, `${y}-04-10`, 'Nyitókészlet')
  addStock(db, sys.id, 5, `${y}-04-10`, 'Nyitókészlet')
  addStock(db, bot.id, 5, `${y}-04-10`, 'Nyitókészlet')

  const op = { operator_name: 'Kovács János', operator_license: 'DEMO-ZK-1234', machine: 'Permetező, 400 l', wind: 'szélcsend', notes: null, end_time: null }
  const all = [p1, p2, p3].map((p) => ({ parcel_id: p.id, treated_area_ha: p.area_ha }))
  const area = all.reduce((a, b) => a + b.treated_area_ha, 0)
  const round = (x: number) => Math.round(x * 100) / 100
  const plan: [string, string, [number, string, number, string][]][] = [
    ['05-12', 'BBCH 15 – 5 levél', [[s.id, 'lisztharmat', 4, 'kg/ha'], [cu.id, 'peronoszpóra', 2, 'kg/ha']]],
    ['05-28', 'BBCH 57 – fürtmegnyúlás', [[s.id, 'lisztharmat', 4, 'kg/ha'], [cu.id, 'peronoszpóra', 2, 'kg/ha']]],
    ['06-12', 'BBCH 65 – teljes virágzás', [[sys.id, 'peronoszpóra', 0.5, 'l/ha']]],
    ['06-27', 'BBCH 71 – terméskötődés', [[sys.id, 'lisztharmat', 0.5, 'l/ha'], [s.id, 'lisztharmat', 3, 'kg/ha']]],
    ['07-14', 'BBCH 77 – fürtzáródás', [[cu.id, 'peronoszpóra', 2, 'kg/ha'], [bot.id, 'szürkerothadás', 1.2, 'l/ha']]],
    ['08-02', 'BBCH 81 – zsendülés kezdete', [[cu.id, 'peronoszpóra', 1.8, 'kg/ha'], [s.id, 'lisztharmat', 3, 'kg/ha']]],
  ]
  for (const [md, bbch, items] of plan)
    saveSpray(db, {
      ...op, date: `${y}-${md}`, start_time: '06:30', water_l_per_ha: 400, temperature_c: 19, phenology: bbch, parcels: all,
      items: items.map(([product_id, pest, dose, dose_unit]) => ({ product_id, pest, dose, dose_unit, total_amount: round(dose * area) })),
    })

  const W = work(db)
  W.create({ parcel_id: p1.id, date: `${y}-02-20`, type: 'metszés', hours: 8, workers: 3, cost_huf: 96000, notes: 'Csapos metszés' })
  W.create({ parcel_id: p2.id, date: `${y}-03-05`, type: 'metszés', hours: 6, workers: 2, cost_huf: 48000, notes: null })
  W.create({ parcel_id: p3.id, date: `${y}-05-20`, type: 'zöldmunka', hours: 5, workers: 2, cost_huf: 40000, notes: 'Hajtásválogatás' })
  W.create({ parcel_id: p1.id, date: `${y}-06-15`, type: 'kaszálás', hours: 3, workers: 1, cost_huf: 15000, notes: 'Sorköz' })

  const H = harvests(db)
  H.create({ parcel_id: p1.id, variety: 'Irsai Olivér', date: `${y}-08-26`, quantity_kg: 1600, must_degree: 17.0, buyer: 'Saját feldolgozás', notes: 'ÉVI miatt csak aug. 23. után lehetett' })
  H.create({ parcel_id: p1.id, variety: 'Olaszrizling', date: `${y}-09-18`, quantity_kg: 8200, must_degree: 19.5, buyer: 'Saját feldolgozás', notes: null })
  H.create({ parcel_id: p2.id, variety: 'Kékfrankos', date: `${y}-10-02`, quantity_kg: 4200, must_degree: 20.5, buyer: 'Saját feldolgozás', notes: null })
  H.create({ parcel_id: p3.id, variety: 'Szürkebarát', date: `${y}-09-25`, quantity_kg: 6900, must_degree: 21.0, buyer: 'Saját feldolgozás', notes: null })

  // Szőlőim (kézzel felvett fajták — ültetvény nélkül) és Listáim
  const vid = (name: string) => (db.prepare('SELECT id FROM varieties WHERE name = ?').get(name) as { id: number } | undefined)?.id
  const mine: [string, string | null][] = [['Muscat bleu', '2 tő a garázs mellett, vesszőről'], ['Bianca', 'Iskolázva, jövőre ültetem'], ['Kodrjanka', null]]
  for (const [name, note] of mine) if (vid(name)) setCollectionItem(db, vid(name)!, note)
  const items = (xs: [string, string | null][]) => xs.filter(([n]) => vid(n)).map(([n, note]) => ({ variety_id: vid(n)!, note }))
  saveList(db, { name: 'Cserélhető vesszők — 2027 tavasz', description: 'Metszéskor szedett, egészséges vesszők. Cserébe korai, magvatlan fajtát keresek.', public: true,
    items: items([['Csabagyöngye', '10 vessző'], ['Pölöskei muskotály', '6 vessző'], ['Nero', '4 vessző, rezisztens'], ['Palatina', '5 vessző']]) })
  saveList(db, { name: 'Kívánságlista', description: null, public: false, items: items([['Arkadia', null], ['Talizman', 'nagy bogyó'], ['Preobrazsenyije', null], ['Velesz', 'magvatlan, korai']]) })
  saveList(db, { name: 'Idei beszerzés', description: 'Ősszel érkezett gyökeres vesszők', public: false, items: items([['Kodrjanka', 'Kertész Annától, Kecskemét'], ['Muscat bleu', 'Fórumos csere']]) })

  setSettings(db, {
    profile_name: 'Minta Gazda', profile_city: 'Badacsonytomaj', profile_contact: 'Üzenetben',
    profile_about: 'Borszőlő a hegyen, csemegeszőlő-gyűjtemény a ház mögött. Vesszőcserében mindig benne vagyok.',
    profile_listed: '1', profile_messaging: '1', notify_messages: '1', notify_forum: '1', notify_digest: '0',
  })
  setSettings(db, { farm_name: 'Bemutató Pincészet', operator_name: op.operator_name, operator_license: op.operator_license, machine: op.machine })
}
