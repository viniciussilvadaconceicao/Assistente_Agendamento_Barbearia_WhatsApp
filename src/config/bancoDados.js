import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.on('connect', () => {
  console.log('[Banco] Conectado ao PostgreSQL');
});

pool.on('error', (erro) => {
  console.error('[Banco] Erro inesperado:', erro.message);
});
