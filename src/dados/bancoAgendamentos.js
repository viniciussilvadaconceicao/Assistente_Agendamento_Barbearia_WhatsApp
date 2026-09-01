import { pool } from '../config/bancoDados.js';

export async function buscarHorariosOcupados(barbeiroId, data) {
  const resultado = await pool.query(
    `SELECT horario
     FROM agendamentos
     WHERE barbeiro_id = $1
       AND data = $2
       AND status IN ('agendado', 'bloqueado')`,
    [barbeiroId, data]
  );

  return resultado.rows.map((linha) => String(linha.horario).slice(0, 5));
}

export async function criarAgendamento({ clienteId, barbeiroId, servicoId, data, horario }) {
  try {
    const resultado = await pool.query(
      `INSERT INTO agendamentos (cliente_id, barbeiro_id, servico_id, data, horario, status)
       VALUES ($1, $2, $3, $4, $5, 'agendado')
       RETURNING id`,
      [clienteId, barbeiroId, servicoId, data, horario]
    );

    return resultado.rows[0];
  } catch (erro) {
    if (erro.code === '23505') {
      throw new Error('HORARIO_OCUPADO');
    }

    throw erro;
  }
}

export async function listarAgendamentosPorData(data) {
  const resultado = await pool.query(
    `SELECT
       a.id,
       a.data,
       a.horario,
       a.status,
       c.nome AS cliente,
       c.telefone,
       b.nome AS barbeiro,
       s.nome AS servico
     FROM agendamentos a
     LEFT JOIN clientes c ON c.id = a.cliente_id
     LEFT JOIN barbeiros b ON b.id = a.barbeiro_id
     LEFT JOIN servicos s ON s.id = a.servico_id
     WHERE a.data = $1
     ORDER BY a.horario`,
    [data]
  );

  return resultado.rows;
}

export async function listarAgendamentosCliente(telefone) {
  const resultado = await pool.query(
    `SELECT
       a.id,
       a.data,
       a.horario,
       b.nome AS barbeiro,
       s.nome AS servico
     FROM agendamentos a
     JOIN clientes c ON c.id = a.cliente_id
     JOIN barbeiros b ON b.id = a.barbeiro_id
     JOIN servicos s ON s.id = a.servico_id
     WHERE c.telefone = $1
       AND a.status = 'agendado'
       AND (a.data + a.horario) > (NOW() AT TIME ZONE 'America/Sao_Paulo')
     ORDER BY a.data, a.horario`,
    [telefone]
  );

  return resultado.rows;
}

export async function cancelarAgendamentoCliente(id, telefone) {
  const resultado = await pool.query(
    `UPDATE agendamentos a
     SET status = 'cancelado'
     FROM clientes c
     WHERE a.cliente_id = c.id
       AND a.id = $1
       AND c.telefone = $2
       AND a.status = 'agendado'
     RETURNING a.id`,
    [id, telefone]
  );

  return resultado.rowCount > 0;
}

export async function cancelarAgendamentoAdministrador(id) {
  const resultado = await pool.query(
    `UPDATE agendamentos
     SET status = 'cancelado'
     WHERE id = $1
       AND status = 'agendado'
     RETURNING id`,
    [id]
  );

  return resultado.rowCount > 0;
}

export async function bloquearHorario(barbeiroId, data, horario) {
  try {
    await pool.query(
      `INSERT INTO agendamentos (barbeiro_id, data, horario, status)
       VALUES ($1, $2, $3, 'bloqueado')`,
      [barbeiroId, data, horario]
    );

    return true;
  } catch (erro) {
    if (erro.code === '23505') {
      throw new Error('HORARIO_OCUPADO');
    }

    throw erro;
  }
}

export async function liberarHorario(barbeiroId, data, horario) {
  const resultado = await pool.query(
    `DELETE FROM agendamentos
     WHERE barbeiro_id = $1
       AND data = $2
       AND horario = $3
       AND status = 'bloqueado'`,
    [barbeiroId, data, horario]
  );

  return resultado.rowCount > 0;
}
