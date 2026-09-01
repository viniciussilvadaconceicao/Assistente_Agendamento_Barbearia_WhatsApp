import { pool } from '../config/bancoDados.js';

export async function registrarMensagemProcessada(idMensagem, telefone) {
  const resultado = await pool.query(
    `INSERT INTO mensagens_processadas (id, telefone)
     VALUES ($1, $2)
     ON CONFLICT (id) DO NOTHING
     RETURNING id`,
    [idMensagem, telefone]
  );

  return resultado.rowCount === 1;
}

export async function removerMensagemProcessada(idMensagem) {
  await pool.query(
    'DELETE FROM mensagens_processadas WHERE id = $1',
    [idMensagem]
  );
}
