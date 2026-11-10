// Fajtacímkék kategóriákba rendezve (a szoloink.hu címke-szűrőjének modern megfelelője).
export interface TagCategory {
  id: string
  name: string
  tags: { id: string; name: string }[]
}

export const TAG_CATEGORIES: TagCategory[] = [
  {
    id: 'use', name: 'Felhasználás',
    tags: [
      { id: 'csemege', name: 'csemegeszőlő' }, { id: 'bor', name: 'borszőlő' },
      { id: 'magvatlan', name: 'magvatlan (kismis)' }, { id: 'kettos', name: 'kettős hasznosítású' },
    ],
  },
  {
    id: 'res', name: 'Ellenállóság',
    tags: [
      { id: 'rezisztens', name: 'rezisztens / interspecifikus' }, { id: 'pero-tol', name: 'peronoszpóra-toleráns' },
      { id: 'liszt-tol', name: 'lisztharmat-toleráns' }, { id: 'fagytuto', name: 'jó fagytűrés' }, { id: 'erzekeny', name: 'betegségekre érzékeny' },
    ],
  },
  {
    id: 'taste', name: 'Íz és bogyó',
    tags: [
      { id: 'muskotaly', name: 'muskotályos' }, { id: 'izabella', name: 'izabella-ízű' }, { id: 'semleges', name: 'semleges, harmonikus' },
      { id: 'nagybogyo', name: 'nagy bogyó' }, { id: 'ropogos', name: 'ropogós hús' },
    ],
  },
  {
    id: 'origin', name: 'Származás',
    tags: [
      { id: 'magyar', name: 'magyar nemesítés' }, { id: 'ukran-orosz', name: 'ukrán / orosz nemesítés' },
      { id: 'nyugat', name: 'nyugat-európai' }, { id: 'regi', name: 'régi / tájfajta' },
    ],
  },
  {
    id: 'grow', name: 'Termesztés',
    tags: [
      { id: 'lugas', name: 'lugasra ajánlott' }, { id: 'eros', name: 'erős növekedésű' },
      { id: 'kezdo', name: 'kezdőknek ajánlott' }, { id: 'nagytermes', name: 'bőtermő' },
    ],
  },
]

export const TAGS = Object.fromEntries(TAG_CATEGORIES.flatMap((c) => c.tags.map((t) => [t.id, { ...t, category: c.id }])))
