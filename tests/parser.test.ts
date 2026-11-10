// A NÉBIH Engedélykeresőről 2026.11.09-én mentett valós lapokon.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FIELD, formFields, parsePermit, parsePhi, parseSearchResults, splitList } from '../server/nebih/parser'

const fx = (f: string) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8')

describe('NÉBIH parser (valós minták)', () => {
  it('kiolvassa az ASP.NET űrlap mezőit', () => {
    const f = formFields(fx('nebih-kereso.html'))
    expect(f.__VIEWSTATE?.length).toBeGreaterThan(100)
    expect(f.__EVENTVALIDATION).toBeTruthy()
    expect(FIELD.query in f).toBe(true)
    expect(f['ctl00$ContentPlaceHolder1$EngedelyTipusCheckBoxListControl$0']).toBe('alapengedély')
  })

  it('találati lista', () => {
    const { hits, has_more } = parseSearchResults(fx('nebih-search-ku.html'), 'Ku')
    expect(has_more).toBe(false)
    expect(hits.length).toBe(13)
    const kumulus = hits.filter((h) => h.name === 'Kumulus S')
    expect(kumulus.map((h) => h.valid_until)).toEqual(expect.arrayContaining(['2012-12-30', '2027-07-31']))
    const old = kumulus.find((h) => h.valid_until === '2012-12-30')!
    expect(old.expired).toBe(true)
    expect(hits[0]).toMatchObject({ query: 'Ku', index: 0, name: 'Kudos', active_substances: 'Prohexadion', permit_type: 'alapengedély', purpose: 'növekedés szabályozó szer' })
  })

  it('Kumulus S törzskönyv', () => {
    const p = parsePermit(fx('nebih-detail-kumulus.html'))!
    expect(p).toMatchObject({
      name: 'Kumulus S', permit_number: '04.2/606-2/2011', permit_type: 'alapengedély', category: 'III.',
      permit_valid_until: '2027-07-31', formulation: 'vízben diszpergálható granulátum (WG)', phi_min: 0, phi_max: 0,
      aerial: false, drone: false,
    })
    expect(p.holder).toMatch(/^BASF Hungária/)
    expect(p.active_substances).toEqual([{ name: 'Kén', concentration: '800 g/kg' }])
    expect(p.cultures).toEqual(expect.arrayContaining(['Alma', 'Szőlő (bor)', 'Szőlő (csemege)']))
    expect(p.pests).toEqual(['levéllikasztó gomba', 'lisztharmat'])
    expect(p.documents.length).toBeGreaterThan(3)
    expect(p.documents[0].url).toMatch(/^https:\/\/novenyvedoszer\.nebih\.gov\.hu\/Engedelykereso\/DocumentHandler\.ashx/)
    const grape = p.uses.find((u) => u.culture === 'Szőlő (bor)')!
    expect(grape).toMatchObject({ pest: 'levéllikasztó gomba, lisztharmat', phi_days: 0, dose_max: null, dose_unit: 'kg/ha' })
  })

  it('Ridomil Gold: ÉVI tartomány, felső értékkel számol', () => {
    const p = parsePermit(fx('nebih-detail-ridomil.html'))!
    expect(p.name).toBe('Ridomil Gold 465 SL')
    expect(p.category).toBe('II.')
    expect([p.phi_min, p.phi_max]).toEqual([3, 28])
    expect(p.uses[0].phi_days).toBe(28)
    expect(p.uses[0].notes).toMatch(/3–28 nap/)
    expect(p.pests).toContain('peronoszpóra')
  })

  it('segédfüggvények', () => {
    expect(splitList('a (b, c), d')).toEqual(['a (b, c)', 'd'])
    expect(parsePhi('3 - 28 nap')).toEqual([3, 28])
    expect(parsePhi('0 nap')).toEqual([0, 0])
    expect(parsePhi('')).toEqual([null, null])
  })
})
