import { pool } from '../config/bancoDados.js';

export async function listarServicos() {
  const resultado = await pool.query(
    'SELECT id, nome, preco, duracao_minutos FROM servicos ORDER BY nome'
  );

  return resultado.rows;
}

export async function buscarServicoPorId(id) {
  const resultado = await pool.query(
    'SELECT id, nome, preco, duracao_minutos FROM servicos WHERE id = $1',
    [id]
  );

  return resultado.rows[0] || null;
}
