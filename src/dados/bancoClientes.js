import { pool } from '../config/bancoDados.js';

export async function buscarOuCriarCliente(nome, telefone) {
  const existente = await pool.query(
    'SELECT id, nome, telefone FROM clientes WHERE telefone = $1',
    [telefone]
  );

  if (existente.rows.length) {
    return existente.rows[0];
  }

  const resultado = await pool.query(
    `INSERT INTO clientes (nome, telefone)
     VALUES ($1, $2)
     RETURNING id, nome, telefone`,
    [nome, telefone]
  );

  return resultado.rows[0];
}
