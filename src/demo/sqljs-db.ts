// A node:sqlite DatabaseSync felületének megfelelő adapter sql.js-hez (SQLite WebAssembly-ben).
import type { Database, SqlValue } from 'sql.js'
import type { Db, Statement } from '../../server/schema'

const norm = (params: any[]): SqlValue[] =>
  params.map((v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : typeof v === 'bigint' ? Number(v) : v))

export function wrapSqlJs(sdb: Database): Db {
  return {
    exec: (sql) => void sdb.exec(sql),
    prepare(sql): Statement {
      return {
        all(...params) {
          const st = sdb.prepare(sql)
          try {
            st.bind(norm(params))
            const rows: any[] = []
            while (st.step()) rows.push(st.getAsObject())
            return rows
          } finally {
            st.free()
          }
        },
        get(...params) {
          return this.all(...params)[0]
        },
        run(...params) {
          sdb.run(sql, norm(params))
          const changes = sdb.getRowsModified()
          const id = sdb.exec('SELECT last_insert_rowid() AS id')[0]?.values[0][0]
          return { changes, lastInsertRowid: Number(id ?? 0) }
        },
      }
    },
  }
}
