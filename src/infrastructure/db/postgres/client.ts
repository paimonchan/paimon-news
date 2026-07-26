import { Pool } from "pg";
import type { Queryable } from "../queryable";
import { makePgQueryable } from "./adapter";
import { runPgMigrations } from "./migrations";
import { seedPgSources } from "./seed";

const globalForPg = globalThis as unknown as {
  __lensaPg?: Queryable;
  __lensaPool?: Pool;
  __lensaReady?: Promise<void>;
};

export function getPg(): Queryable {
  if (globalForPg.__lensaPg) return globalForPg.__lensaPg;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  globalForPg.__lensaPool = pool;

  const q = makePgQueryable(pool);
  globalForPg.__lensaPg = q;

  globalForPg.__lensaReady = runPgMigrations(q)
    .then(() => seedPgSources(q))
    .catch((err) => {
      console.error("[pg] Migrasi/seed gagal:", err);
    });

  return q;
}

export async function waitForPg(): Promise<void> {
  await globalForPg.__lensaReady;
}
