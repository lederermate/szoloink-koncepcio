# Szőlőink – modernizált felület-koncepció

Felület-javaslat a [szoloink.hu](https://szoloink.hu) továbbfejlesztéséhez: a meglévő funkciók
modern megjelenéssel (mintaadatokkal), kiegészítve egy **működő permetezési naplóval** és a
**NÉBIH Növényvédő szer Engedélykeresőhöz kötött szeradatbázissal**.

> A szoloink.hu tartalmát (leírások, fotók, fórum) nem másoltuk át: a fajtaleírások saját
> mintaszövegek, a fotók helyén generált fürt-illusztráció, a közösségi részek kitalált mintaadatok.

## Mi működik és mi minta?

| Terület | Állapot |
|---|---|
| Fajtakatalógus: elírástűrő (cirill-tűrő) keresés, címke-/szín-/érésszűrők, A–Z lista, adatlap érési sávval, új fajta / szerkesztés | **működik** (24 mintafajta) |
| Fajtaadatlap → **Növényvédelem** fül: bor/csemege kultúrára engedélyezett szerek, ÉVI, „legkésőbbi permetezés” a várható érés alapján, saját kezelések | **működik – új** |
| Permetezési napló, élő ellenőrzés, nyomtatható napló | **működik – új** |
| Szeradatbázis + élő NÉBIH keresés és import | **működik – új** |
| Kertem: parcellák (fajtához kötve), ÉVI/MVI-állapot, raktár, munkanapló, szüret | **működik** |
| Főoldal eseményfolyam, cikkek, fórum, „kik termesztik”, verziótörténet, bejelentkezett felhasználó | statikus minta |

## Funkciók részletesen (Kertem / napló)

- **Kertem** – terület, kezelések, munkaórák, szüret; ültetvényenként az ÉVI/MVI lejárata.
- **Szőlőim** – hrsz., fajta (katalógusból), alany, sor- és tőtáv, tőkeszám, idővonal.
- **Permetezési napló** – több ültetvény, tankkeverék, automatikus szermennyiség-számítás
  (l/ha, kg/ha, ml/ha, g/ha, %, l/hl), fenológia (BBCH), kezelő, gép, lémennyiség.
  Nyomtatható / PDF napló (A4 fekvő).
- **Élő növényvédelmi ellenőrzés** mentés előtt: szőlőben engedélyezett-e a szer, károsító
  egyezés, dózishatár, évi max. kezelésszám, lejárt engedély, ÉVI-n belüli szüret, készlet,
  I./II. forgalmi kategóriánál a képesítés megléte. Hibánál a mentés csak megerősítéssel
  történik meg.
- **Szeradatbázis** – NÉBIH-ből importált vagy kézzel rögzített szerek, felhasználási
  táblával (kultúra, károsító, dózis, ÉVI, MVI, kezelésszám); JSON import.
- **Raktár** – bevételezés, a permetezések automatikusan levonják a készletet.
- **Munkanapló**, **Szüret** (mustfok, t/ha, ÉVI-figyelmeztetés), **Beállítások**, JSON mentés.
- Világos/sötét téma, mobilbarát (alsó navigáció).

## Indítás

Node.js ≥ 22.13 szükséges (a beépített `node:sqlite` miatt).

```bash
npm install
npm run dev          # API :3001 + Vite :5173
# vagy éles mód:
npm run build && npm start   # http://localhost:3001
```

Az első induláskor bemutató adatok töltődnek be (kitalált ültetvények és **DEMO** szerek –
ezek nem valós engedélyadatok, a Szeradatbázis oldalon egy kattintással törölhetők).
`SEED=0` környezeti változóval kikapcsolható. Az adatbázis: `data/szolonaplo.db`.

## NÉBIH integráció

A [NÉBIH Növényvédő szer Engedélykereső](https://novenyvedoszer.nebih.gov.hu/Engedelykereso/kereso)
ASP.NET WebForms oldal; az adapter (`server/nebih/`) ugyanazt a postback-folyamatot járja be, mint a böngésző:

1. a keresőlap letöltése (ViewState + munkamenet-süti),
2. keresés szernévre (`SzernevTextControl`, `KeresesButton`), első 50 találat,
3. a kiválasztott sor törzskönyve (`NovszerGridView` → `Select$N`).

Importáláskor elmentjük: engedélyszám és -típus, érvényesség, felhasználási/türelmi idő, forgalmi kategória,
engedélyes, rendeltetés, formuláció, hatóanyag-összetétel, **kultúrák**, **károsítók**, ÉVI,
légi/drónos kijuttatás, ökológiai felhasználhatóság, méhveszélyesség és az **engedélyokirat PDF-ek** linkjei.

Korlátok (a NÉBIH adatlap tartalmából adódnak):
- **Dózis, MVI és max. kezelésszám nincs a törzskönyvben** — csak az engedélyokirat PDF-ben. Ezek a
  Szeradatbázisban kézzel megadhatók; az újraszinkron megőrzi őket.
- Az ÉVI több kultúránál tartomány (pl. „3 - 28 nap”); ilyenkor a **felső értékkel** számolunk, és a napló jelzi.

Parancssor: `npm run nebih -- status | search <név> | import <név> <sorindex> | resync`

Proxy mögött a Node `fetch` a `NODE_USE_ENV_PROXY=1` beállítással használja a `HTTPS_PROXY`-t (Node ≥ 22.21) —
az npm scriptek ezt beállítják.

## Tesztek

```bash
npm test        # szabálylogika + NÉBIH parser (valós, mentett NÉBIH lapokon)
npm run typecheck
```

## Technológia

React 19 + Vite + Tailwind CSS v4 + TanStack Query · Express 5 + node:sqlite + Zod · Cheerio.
