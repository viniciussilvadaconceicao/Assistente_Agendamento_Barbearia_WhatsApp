import { obterSessao, atualizarEtapa, atualizarDados, limparSessao } from '../nucleo/contextoBot.js';
import { enviarMensagemTexto } from '../servicos/clienteWhatsApp.js';
import { listarServicos, buscarServicoPorId } from '../dados/bancoServicos.js';
import { listarBarbeiros, buscarBarbeiroPorId } from '../dados/bancoBarbeiros.js';
import { buscarOuCriarCliente } from '../dados/bancoClientes.js';
import {
  buscarHorariosOcupados,
  criarAgendamento,
  listarAgendamentosCliente,
  cancelarAgendamento
} from '../dados/bancoAgendamentos.js';

const HORARIOS_PADRAO = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

function textoMenuCliente() {
  return [
    '*Barbearia Bot*',
    '',
    '1 - Agendar horario',
    '2 - Ver servicos',
    '3 - Meus agendamentos',
    '4 - Cancelar agendamento',
    '0 - Encerrar'
  ].join('\n');
}

function formatarData(data) {
  const [ano, mes, dia] = String(data).slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

function proximosDias(quantidade = 5) {
  const dias = [];
  const hoje = new Date();

  for (let i = 0; dias.length < quantidade; i++) {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() + i);

    const diaSemana = data.getDay();
    if (diaSemana === 0) continue;

    dias.push(data.toISOString().slice(0, 10));
  }

  return dias;
}

async function enviarMenu(telefone) {
  atualizarEtapa(telefone, 'menu');
  await enviarMensagemTexto(telefone, textoMenuCliente());
}

async function enviarServicos(telefone) {
  const servicos = await listarServicos();

  if (!servicos.length) {
    await enviarMensagemTexto(telefone, 'Nenhum servico cadastrado.');
    return enviarMenu(telefone);
  }

  const texto = servicos
    .map((servico) => `${servico.id} - ${servico.nome} | R$ ${Number(servico.preco).toFixed(2)}`)
    .join('\n');

  await enviarMensagemTexto(telefone, `*Servicos disponiveis:*\n\n${texto}`);
}

export async function fluxoCliente(mensagem) {
  const telefone = mensagem.de;
  const texto = mensagem.texto.trim();
  const sessao = obterSessao(telefone);

  if (['menu', 'oi', 'ola', 'olá', 'inicio', 'início'].includes(texto.toLowerCase())) {
    return enviarMenu(telefone);
  }

  if (texto === '0') {
    limparSessao(telefone);
    return enviarMensagemTexto(telefone, 'Atendimento encerrado. Obrigado!');
  }

  if (sessao.etapa === 'menu') {
    if (texto === '1') {
      await enviarServicos(telefone);
      atualizarEtapa(telefone, 'escolhendo_servico');
      return enviarMensagemTexto(telefone, '\nDigite o numero do servico desejado.');
    }

    if (texto === '2') {
      await enviarServicos(telefone);
      return enviarMenu(telefone);
    }

    if (texto === '3') {
      const agendamentos = await listarAgendamentosCliente(telefone);

      if (!agendamentos.length) {
        await enviarMensagemTexto(telefone, 'Voce ainda nao possui agendamentos.');
        return enviarMenu(telefone);
      }

      const lista = agendamentos
        .map((item) => `${item.id} - ${formatarData(item.data)} as ${String(item.horario).slice(0, 5)} com ${item.barbeiro} (${item.servico})`)
        .join('\n');

      await enviarMensagemTexto(telefone, `*Seus agendamentos:*\n\n${lista}`);
      return enviarMenu(telefone);
    }

    if (texto === '4') {
      const agendamentos = await listarAgendamentosCliente(telefone);

      if (!agendamentos.length) {
        await enviarMensagemTexto(telefone, 'Voce nao possui agendamentos para cancelar.');
        return enviarMenu(telefone);
      }

      const lista = agendamentos
        .map((item) => `${item.id} - ${formatarData(item.data)} as ${String(item.horario).slice(0, 5)} com ${item.barbeiro}`)
        .join('\n');

      atualizarEtapa(telefone, 'cancelando_agendamento');
      return enviarMensagemTexto(telefone, `Digite o ID do agendamento para cancelar:\n\n${lista}`);
    }

    return enviarMenu(telefone);
  }

  if (sessao.etapa === 'cancelando_agendamento') {
    const cancelado = await cancelarAgendamento(Number(texto));
    await enviarMensagemTexto(telefone, cancelado ? 'Agendamento cancelado com sucesso.' : 'Agendamento nao encontrado.');
    return enviarMenu(telefone);
  }

  if (sessao.etapa === 'escolhendo_servico') {
    const servico = await buscarServicoPorId(Number(texto));

    if (!servico) {
      return enviarMensagemTexto(telefone, 'Servico nao encontrado. Digite um numero valido.');
    }

    atualizarDados(telefone, { servico });

    const barbeiros = await listarBarbeiros();
    const lista = barbeiros.map((barbeiro) => `${barbeiro.id} - ${barbeiro.nome}`).join('\n');

    atualizarEtapa(telefone, 'escolhendo_barbeiro');
    return enviarMensagemTexto(telefone, `Escolha o barbeiro:\n\n${lista}`);
  }

  if (sessao.etapa === 'escolhendo_barbeiro') {
    const barbeiro = await buscarBarbeiroPorId(Number(texto));

    if (!barbeiro) {
      return enviarMensagemTexto(telefone, 'Barbeiro nao encontrado. Digite um numero valido.');
    }

    atualizarDados(telefone, { barbeiro });

    const dias = proximosDias();
    const lista = dias.map((dia, indice) => `${indice + 1} - ${formatarData(dia)}`).join('\n');

    atualizarDados(telefone, { dias });
    atualizarEtapa(telefone, 'escolhendo_dia');
    return enviarMensagemTexto(telefone, `Escolha o dia:\n\n${lista}`);
  }

  if (sessao.etapa === 'escolhendo_dia') {
    const indice = Number(texto) - 1;
    const data = sessao.dados.dias?.[indice];

    if (!data) {
      return enviarMensagemTexto(telefone, 'Dia invalido. Digite uma opcao da lista.');
    }

    const ocupados = await buscarHorariosOcupados(sessao.dados.barbeiro.id, data);
    const livres = HORARIOS_PADRAO.filter((horario) => !ocupados.includes(horario));

    if (!livres.length) {
      return enviarMensagemTexto(telefone, 'Nao ha horarios livres nesse dia. Digite menu para voltar.');
    }

    atualizarDados(telefone, { data, horarios: livres });
    atualizarEtapa(telefone, 'escolhendo_horario');

    const lista = livres.map((horario, indiceHorario) => `${indiceHorario + 1} - ${horario}`).join('\n');
    return enviarMensagemTexto(telefone, `Escolha o horario:\n\n${lista}`);
  }

  if (sessao.etapa === 'escolhendo_horario') {
    const indice = Number(texto) - 1;
    const horario = sessao.dados.horarios?.[indice];

    if (!horario) {
      return enviarMensagemTexto(telefone, 'Horario invalido. Digite uma opcao da lista.');
    }

    atualizarDados(telefone, { horario });
    atualizarEtapa(telefone, 'informando_nome');

    return enviarMensagemTexto(telefone, 'Para confirmar, digite seu nome completo.');
  }

  if (sessao.etapa === 'informando_nome') {
    if (texto.length < 3) {
      return enviarMensagemTexto(telefone, 'Digite um nome valido para o agendamento.');
    }

    const cliente = await buscarOuCriarCliente(texto, telefone);
    const { barbeiro, servico, data, horario } = sessao.dados;

    try {
      await criarAgendamento({
        clienteId: cliente.id,
        barbeiroId: barbeiro.id,
        servicoId: servico.id,
        data,
        horario
      });
    } catch (erro) {
      if (erro.message === 'HORARIO_OCUPADO') {
        await enviarMensagemTexto(telefone, 'Esse horario acabou de ser ocupado. Digite menu para tentar outro.');
        return enviarMenu(telefone);
      }

      throw erro;
    }

    limparSessao(telefone);
    return enviarMensagemTexto(
      telefone,
      `Agendamento confirmado!\n\nCliente: ${cliente.nome}\nServico: ${servico.nome}\nBarbeiro: ${barbeiro.nome}\nData: ${formatarData(data)}\nHorario: ${horario}`
    );
  }

  return enviarMenu(telefone);
}
