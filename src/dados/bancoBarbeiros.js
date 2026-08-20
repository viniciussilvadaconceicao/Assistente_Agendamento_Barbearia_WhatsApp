import { pool } from '../config/bancoDados.js';

export async function listarBarbeiros() {
  const resultado = await pool.query(
    'SELECT id, nome, telefone FROM barbeiros ORDER BY nome'
  );

  return resultado.rows;
}

export async function buscarBarbeiroPorId(id) {
  const resultado = await pool.query(
    'SELECT id, nome, telefone FROM barbeiros WHERE id = $1',
    [id]
  );

  return resultado.rows[0] || null;
}
