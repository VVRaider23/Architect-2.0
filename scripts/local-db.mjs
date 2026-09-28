// Local stand-in for the production Postgres: PGlite (real Postgres compiled to WASM) served over the
// normal Postgres wire protocol, so the app talks to it exactly as it talks to Neon.
// Usage: node scripts/local-db.mjs [port]   then DATABASE_URL=postgres://postgres@localhost:5433/postgres
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const port = Number(process.argv[2] ?? 5433);
const db = await PGlite.create();
const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1' });
await server.start();
console.log(`local postgres ready on ${port}`);
process.on('SIGTERM', async () => {
  await server.stop();
  await db.close();
  process.exit(0);
});
