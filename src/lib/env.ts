/** Böngészős demó mód (GitHub Pages): szerver nélkül, sql.js-sel a böngészőben. */
export const DEMO = import.meta.env.VITE_DEMO === '1'

/** Alkalmazáson belüli útvonal teljes URL-je (új lapon nyitáshoz). Demóban hash-alapú útválasztás. */
export const appHref = (path: string) => (DEMO ? `${import.meta.env.BASE_URL}#${path}` : path)
