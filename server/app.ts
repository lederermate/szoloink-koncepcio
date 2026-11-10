import express, { type NextFunction, type Request, type Response } from 'express'
import type { Db } from './schema.ts'
import { buildRoutes, errorResponse } from './routes.ts'
import * as nebih from './nebih/client.ts'

/** Express adapter a keretrendszer-független útvonaltáblához (server/routes.ts). */
export function createApp(db: Db) {
  const app = express()
  app.use(express.json({ limit: '10mb' }))
  const r = express.Router()
  for (const route of buildRoutes(db, nebih)) {
    const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete'
    r[method](route.path, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const out = await route.handler({ params: req.params as Record<string, string>, query: req.query as Record<string, string>, body: req.body })
        if (route.path === '/backup')
          res.setHeader('Content-Disposition', `attachment; filename="szoloink-mentes-${new Date().toISOString().slice(0, 10)}.json"`)
        res.status(route.status ?? 200).json(out ?? { ok: true })
      } catch (e) {
        next(e)
      }
    })
  }
  app.use('/api', r)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const { status, body } = errorResponse(err)
    if (status >= 500 && status !== 502) console.error(err)
    res.status(status).json(body)
  })
  return app
}
