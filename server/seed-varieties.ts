// MINTA fajtakatalógus a koncepcióhoz. A leírások és érési idők tájékoztató jellegű, saját
// összefoglalók — a valós rendszerben a szoloink.hu közösségi adatbázisa szolgáltatná őket.
import type { Db } from './schema.ts'
import type { BerryColor } from '../shared/types.ts'

type V = [name: string, other: string | null, color: BerryColor, from: number, to: number, tags: string[], pop: number, desc: string]

const V: V[] = [
  ['Arkadia', 'Аркадия, Nasztya', 'fehér', 115, 125, ['csemege', 'ukran-orosz', 'nagybogyo', 'nagytermes', 'kezdo', 'semleges'], 96,
    'Nagy, kúpos fürtű, sárgásfehér bogyójú csemegeszőlő. Bőtermő, megbízható fajta, amely kezdő termesztőknek is jól beválik; íze harmonikus, enyhén édes.'],
  ['Kodrjanka', 'Кодрянка, Fekete Magarach', 'kék', 110, 120, ['csemege', 'ukran-orosz', 'nagybogyo', 'pero-tol', 'eros'], 88,
    'Korai-középérésű, sötétkék, megnyúlt bogyójú csemegefajta. Erős növekedésű, a peronoszpórát viszonylag jól tűri; hűvösebb évjáratban is beérik.'],
  ['Velesz', 'Велес, Kismis Velesz', 'rózsaszín', 95, 105, ['csemege', 'magvatlan', 'ukran-orosz', 'muskotaly', 'fagytuto'], 91,
    'Korai, magvatlan rózsaszín kismis enyhe muskotályos zamattal. Nagy, laza fürtjei mutatósak; esős időben a bogyó repedésre hajlamos lehet.'],
  ['Moldova', 'Молдова', 'kék', 155, 165, ['csemege', 'ukran-orosz', 'ropogos', 'pero-tol', 'lugas', 'eros'], 84,
    'Késői érésű, sötétkék, ropogós húsú csemegeszőlő. Jól tárolható, erős növekedése miatt lugasra kiváló; a peronoszpórával szemben ellenálló.'],
  ['Preobrazsenyije', 'Преображение, Átváltozás', 'rózsaszín', 110, 115, ['csemege', 'ukran-orosz', 'nagybogyo', 'nagytermes'], 90,
    'Nagyon nagy, ovális rózsaszín bogyók, tetszetős fürtök. Korán érik, bőtermő; a túlterhelést érdemes fürtritkítással szabályozni.'],
  ['Talizman', 'Талисман, Kesa', 'fehér', 125, 135, ['csemege', 'ukran-orosz', 'nagybogyo', 'fagytuto', 'muskotaly'], 79,
    'Hatalmas fürtű, nagy bogyójú fehér csemegefajta, érett állapotban halvány muskotállyal. Jó fagytűrésű, de a megfelelő kötődéshez porzópartner ajánlott.'],
  ['Kismis Lucsisztij', 'Кишмиш лучистый', 'piros', 125, 130, ['csemege', 'magvatlan', 'ukran-orosz', 'semleges'], 82,
    'Magvatlan, piros-rózsaszín bogyójú kismis harmonikus ízzel. Nagy fürtöket hoz, a gombás betegségekre közepesen fogékony.'],
  ['Lívia', null, 'rózsaszín', 110, 115, ['csemege', 'magyar', 'muskotaly', 'nagybogyo'], 87,
    'Magyar nemesítésű, korai rózsaszín csemegeszőlő intenzív muskotályos zamattal. Látványos fürtjei piacon is keresettek; a lisztharmatra érzékeny.'],
  ['Palatina', 'Palatina Muskotály', 'fehér', 110, 120, ['csemege', 'magyar', 'muskotaly', 'pero-tol', 'kezdo'], 75,
    'Magyar nemesítésű, aranysárga muskotályos csemegeszőlő. Jó ellenállósága miatt kevés növényvédelemmel is termeszthető, házikertbe ajánlott.'],
  ['Csabagyöngye', 'Perle von Csaba', 'fehér', 95, 105, ['csemege', 'magyar', 'regi', 'muskotaly', 'erzekeny'], 72,
    'Régi magyar, nagyon korai muskotályos csemegefajta. Bogyója kisebb, íze kiváló; betegségekre érzékeny, ezért rendszeres védelmet igényel.'],
  ['Pölöskei muskotály', null, 'fehér', 115, 125, ['csemege', 'magyar', 'muskotaly', 'fagytuto'], 70,
    'Magyar nemesítésű, középkorai muskotályos csemegeszőlő. Jó fagytűrésű, megbízhatóan termő fajta.'],
  ['Szőlőskertek királynője muskotály', 'Királynő', 'fehér', 115, 125, ['csemege', 'magyar', 'regi', 'muskotaly', 'nagybogyo', 'erzekeny'], 74,
    'Klasszikus magyar muskotályos csemegeszőlő nagy, borostyánsárga bogyókkal. Ízében kiemelkedő, de a peronoszpórára és a szürkerothadásra érzékeny.'],
  ['Nero', 'Néró', 'kék', 120, 130, ['kettos', 'magyar', 'rezisztens', 'pero-tol', 'liszt-tol', 'fagytuto', 'kezdo'], 81,
    'Magyar nemesítésű rezisztens kék fajta, csemegeként és borkészítésre is használható. Kiváló ellenállósága miatt vegyszerszegény termesztésre alkalmas.'],
  ['Bianca', null, 'fehér', 125, 135, ['bor', 'magyar', 'rezisztens', 'pero-tol', 'liszt-tol', 'fagytuto', 'nagytermes'], 78,
    'Magyar nemesítésű rezisztens borszőlő. Jó fagytűrésű, a gombás betegségekkel szemben ellenálló; magas cukorgyűjtő képességű.'],
  ['Muscat bleu', 'Muscat Bleu', 'kék', 115, 120, ['csemege', 'nyugat', 'rezisztens', 'muskotaly', 'pero-tol', 'liszt-tol'], 86,
    'Svájci nemesítésű, rezisztens kék muskotályos csemegeszőlő. Kis-közepes fürtök, finom zamat; házikertben szinte permetezés nélkül is termeszthető.'],
  ['Izabella', 'Isabella, Otelló-típus', 'kék', 150, 160, ['kettos', 'izabella', 'regi', 'fagytuto', 'lugas', 'eros'], 68,
    'Amerikai eredetű, régi direkttermő fajta jellegzetes „rókaízzel”. Rendkívül edzett, lugasra kiváló; borának forgalmazása korlátozott.'],
  ['Kunleány', null, 'fehér', 130, 140, ['bor', 'magyar', 'pero-tol', 'fagytuto', 'nagytermes'], 66,
    'Magyar nemesítésű, interspecifikus hátterű fehér borszőlő. Jó fagytűrésű, bőtermő, homoki termőhelyeken elterjedt.'],
  ['Zala gyöngye', null, 'fehér', 115, 125, ['kettos', 'magyar', 'fagytuto', 'semleges'], 64,
    'Magyar nemesítésű korai fehér fajta, bor- és csemegeszőlőként is használják. Jó fagytűrésű, de a szürkerothadásra hajlamos.'],
  ['Irsai Olivér', null, 'fehér', 110, 120, ['bor', 'magyar', 'muskotaly', 'erzekeny'], 77,
    'Korai érésű, illatos muskotályos fehér borszőlő, csemegeként is kedvelt. A lisztharmatra és a rothadásra érzékeny.'],
  ['Kékfrankos', 'Blaufränkisch, Lemberger', 'kék', 145, 155, ['bor', 'regi', 'nyugat', 'nagytermes'], 83,
    'Közép-európai vörösborszőlő, Magyarország egyik legelterjedtebb kék fajtája. Megbízhatóan terem, a lisztharmatra érzékenyebb.'],
  ['Olaszrizling', 'Welschriesling, Graševina', 'fehér', 150, 160, ['bor', 'regi', 'nyugat', 'nagytermes'], 80,
    'Hazánk legelterjedtebb fehér borszőlője. Késői érésű, bőtermő; a szürkerothadásra hajlamos lehet.'],
  ['Furmint', null, 'fehér', 160, 170, ['bor', 'magyar', 'regi', 'erzekeny'], 85,
    'Tokaj-hegyaljai fő fajta, savgerinces fehérborok és aszú alapanyaga. Késői érésű, a botritiszre (nemes- és szürkerothadás) fogékony.'],
  ['Szürkebarát', 'Pinot gris, Grauburgunder', 'rózsaszín', 135, 145, ['bor', 'nyugat', 'regi', 'erzekeny'], 73,
    'Szürkés-rózsaszín bogyójú fehérborszőlő, a badacsonyi bor egyik ikonja. Tömött fürtjei miatt a szürkerothadásra érzékeny.'],
  ['Cabernet Sauvignon', null, 'kék', 160, 170, ['bor', 'nyugat', 'fagytuto'], 76,
    'Világfajta vörösborszőlő, kis bogyójú, vastag héjú. Késői érésű, meleg termőhelyet igényel.'],
]

export function seedVarieties(db: Db) {
  const n = db.prepare('SELECT COUNT(*) c FROM varieties').get() as { c: number }
  if (Number(n.c) > 0) return
  const ins = db.prepare(
    'INSERT INTO varieties (name, other_names, berry_color, ripening_from, ripening_to, tags, popularity, description, links) VALUES (?,?,?,?,?,?,?,?,?)',
  )
  for (const [name, other, color, from, to, tags, pop, desc] of V)
    ins.run(name, other, color, from, to, JSON.stringify(tags), pop, desc, JSON.stringify([{ label: 'VIVC fajtakatalógus', url: 'https://www.vivc.de/' }]))
}
