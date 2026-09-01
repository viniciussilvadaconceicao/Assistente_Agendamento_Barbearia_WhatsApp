import { obterSessao, atualizarEtapa, atualizarDados, limparSessao } from '../nucleo/contextoBot.js';
import { enviarMensagemInterativa, enviarMensagemTexto } from '../servicos/clienteWhatsApp.js';
import { listarBarbeiros, buscarBarbeiroPorId } from '../dados/bancoBarbeiros.js';
import {
  listarAgendamentosPorData,
  cancelarAgendamentoAdministrador,
  bloquearHorario,
  liberarHorario
} from '../dados/bancoAgendamentos.js';

function criarListaInterativa({ texto, botao = 'Abrir menu', titulo = 'Opcoes', linhas }) {
  return {
    type: 'interactive',
    interactive: {
      type: 'list',
      body: {
        text: texto
      },
      action: {
        button: botao,
        sections: [{
          title: titulo,
          rows: linhas
        }]
      }
    }
  };
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatarData(data) {
  const [ano, mes, dia] = String(data).slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

function dataValida(texto) {
  return /^\d{4}-\d{2}-\d{2}$/.test(texto);
}

function horarioValido(texto) {
  return /^\d{2}:\d{2}$/.test(texto);
}

async function enviarMenuAdmin(telefone) {
  atualizarEtapa(telefone, 'menu_admin');
  await enviarMensagemInterativa(telefone, criarListaInterativa({
    texto: '*Menu do Administrador*\n\nEscolha uma opcao.',
    botao: 'Abrir menu',
    titulo: 'Administracao',
    linhas: [
      { id: '1', title: 'Ver agenda' },
      { id: '2', title: 'Bloquear horario' },
      { id: '3', title: 'Liberar horario' },
      { id: '4', title: 'Cancelar agendamento' },
      { id: '0', title: 'Encerrar' }
    ]
  }));
}

async function enviarListaBarbeiros(telefone, proximaEtapa) {
  const barbeiros = await listarBarbeiros();

  if (!barbeiros.length) {
    await enviarMensagemTexto(telefone, 'Nenhum barbeiro cadastrado.');
    return enviarMenuAdmin(telefone);
  }

  const lista = barbeiros.map((barbeiro) => ({
    id: String(barbeiro.id),
    title: String(barbeiro.nome).slice(0, 24)
  }));
  atualizarEtapa(telefone, proximaEtapa);
  return enviarMensagemInterativa(telefone, criarListaInterativa({
    texto: '*Escolha o barbeiro*',
    botao: 'Ver barbeiros',
    titulo: 'Profissionais',
    linhas: lista
  }));
}

export async function fluxoAdministrador(mensagem) {
  const telefone = mensagem.de;
  const texto = mensagem.texto.trim();
  const sessao = obterSessao(telefone);

  if (['menu', 'oi', 'ola', 'olá', 'inicio', 'início'].includes(texto.toLowerCase())) {
    return enviarMenuAdmin(telefone);
  }

  if (texto === '0') {
    limparSessao(telefone);
    return enviarMensagemTexto(telefone, 'Atendimento administrativo encerrado.');
  }

  if (sessao.etapa === 'menu' || sessao.etapa === 'menu_admin') {
    if (texto === '1') {
      atualizarEtapa(telefone, 'informando_data_agenda');
      return enviarMensagemTexto(telefone, `Digite a data no formato AAAA-MM-DD.\nExemplo: ${hojeIso()}`);
    }

    if (texto === '2') {
      return enviarListaBarbeiros(telefone, 'bloqueio_barbeiro');
    }

    if (texto === '3') {
      return enviarListaBarbeiros(telefone, 'liberacao_barbeiro');
    }

    if (texto === '4') {
      atualizarEtapa(telefone, 'cancelamento_id');
      return enviarMensagemTexto(telefone, 'Digite o ID do agendamento que deseja cancelar.');
    }

    return enviarMenuAdmin(telefone);
  }

  if (sessao.etapa === 'informando_data_agenda') {
    if (!dataValida(texto)) {
      return enviarMensagemTexto(telefone, 'Data invalida. Use o formato AAAA-MM-DD.');
    }

    const agendamentos = await listarAgendamentosPorData(texto);

    if (!agendamentos.length) {
      await enviarMensagemTexto(telefone, `Nenhum agendamento em ${formatarData(texto)}.`);
      return enviarMenuAdmin(telefone);
    }

    const lista = agendamentos.map((item) => {
      const horario = String(item.horario).slice(0, 5);

      if (item.status === 'bloqueado') {
        return `${item.id} - ${horario} | ${item.barbeiro || 'Barbeiro'} | BLOQUEADO`;
      }

      return `${item.id} - ${horario} | ${item.barbeiro} | ${item.cliente} | ${item.servico}`;
    }).join('\n');

    await enviarMensagemTexto(telefone, `*Agenda de ${formatarData(texto)}:*\n\n${lista}`);
    return enviarMenuAdmin(telefone);
  }

  if (sessao.etapa === 'cancelamento_id') {
    const cancelado = await cancelarAgendamentoAdministrador(Number(texto));
    await enviarMensagemTexto(telefone, cancelado ? 'Agendamento cancelado.' : 'Agendamento nao encontrado ou ja cancelado.');
    return enviarMenuAdmin(telefone);
  }

  if (sessao.etapa === 'bloqueio_barbeiro' || sessao.etapa === 'liberacao_barbeiro') {
    const barbeiro = await buscarBarbeiroPorId(Number(texto));

    if (!barbeiro) {
      return enviarMensagemTexto(telefone, 'Barbeiro nao encontrado. Digite um numero valido.');
    }

    atualizarDados(telefone, { barbeiro });
    atualizarEtapa(telefone, sessao.etapa === 'bloqueio_barbeiro' ? 'bloqueio_data' : 'liberacao_data');

    return enviarMensagemTexto(telefone, `Digite a data no formato AAAA-MM-DD.\nExemplo: ${hojeIso()}`);
  }

  if (sessao.etapa === 'bloqueio_data' || sessao.etapa === 'liberacao_data') {
    if (!dataValida(texto)) {
      return enviarMensagemTexto(telefone, 'Data invalida. Use o formato AAAA-MM-DD.');
    }

    atualizarDados(telefone, { data: texto });
    atualizarEtapa(telefone, sessao.etapa === 'bloqueio_data' ? 'bloqueio_horario' : 'liberacao_horario');

    return enviarMensagemTexto(telefone, 'Digite o horario no formato HH:MM. Exemplo: 14:00');
  }

  if (sessao.etapa === 'bloqueio_horario') {
    if (!horarioValido(texto)) {
      return enviarMensagemTexto(telefone, 'Horario invalido. Use o formato HH:MM.');
    }

    try {
      await bloquearHorario(sessao.dados.barbeiro.id, sessao.dados.data, texto);
      await enviarMensagemTexto(telefone, 'Horario bloqueado com sucesso.');
    } catch (erro) {
      await enviarMensagemTexto(telefone, erro.message === 'HORARIO_OCUPADO' ? 'Esse horario ja esta ocupado ou bloqueado.' : 'Erro ao bloquear horario.');
    }

    return enviarMenuAdmin(telefone);
  }

  if (sessao.etapa === 'liberacao_horario') {
    if (!horarioValido(texto)) {
      return enviarMensagemTexto(telefone, 'Horario invalido. Use o formato HH:MM.');
    }

    const liberado = await liberarHorario(sessao.dados.barbeiro.id, sessao.dados.data, texto);
    await enviarMensagemTexto(telefone, liberado ? 'Horario liberado com sucesso.' : 'Bloqueio nao encontrado para esse horario.');
    return enviarMenuAdmin(telefone);
  }

  return enviarMenuAdmin(telefone);
}
