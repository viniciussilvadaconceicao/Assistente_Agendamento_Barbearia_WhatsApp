import { obterSessao, atualizarEtapa, atualizarDados, limparSessao } from '../nucleo/contextoBot.js';
import { enviarMensagemInterativa, enviarMensagemTexto } from '../servicos/clienteWhatsApp.js';
import { listarServicos, buscarServicoPorId } from '../dados/bancoServicos.js';
import { listarBarbeiros, buscarBarbeiroPorId } from '../dados/bancoBarbeiros.js';
import { buscarOuCriarCliente } from '../dados/bancoClientes.js';
import {
  buscarHorariosOcupados,
  criarAgendamento,
  listarAgendamentosCliente,
  cancelarAgendamentoCliente
} from '../dados/bancoAgendamentos.js';

const HORARIOS_PADRAO = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const TIME_ZONE = 'America/Sao_Paulo';

function limitarTitulo(valor) {
  return String(valor).slice(0, 24);
}

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

function formatarData(data) {
  if (data instanceof Date) {
    const dia = String(data.getUTCDate()).padStart(2, '0');
    const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
    return `${dia}/${mes}`;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(String(data))) {
    const [ano, mes, dia] = String(data).slice(0, 10).split('-');
    return `${dia}/${mes}`;
  }

  const dataConvertida = new Date(data);
  if (!Number.isNaN(dataConvertida.getTime())) {
    const partes = obterPartesDataHoraLocal(dataConvertida);
    return `${partes.day}/${partes.month}`;
  }

  const [ano, mes, dia] = String(data).slice(0, 10).split('-');
  return `${dia}/${mes}`;
}

function obterPartesDataHoraLocal(data = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(data);

  return Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
}

function hojeIso() {
  const partes = obterPartesDataHoraLocal();
  return `${partes.year}-${partes.month}-${partes.day}`;
}

function horaAtualMinutos() {
  const partes = obterPartesDataHoraLocal();
  return Number(partes.hour) * 60 + Number(partes.minute);
}

function horarioParaMinutos(horario) {
  const [hora, minuto] = String(horario).split(':').map(Number);
  return hora * 60 + minuto;
}

function filtrarHorariosFuturos(data, horarios) {
  if (data !== hojeIso()) {
    return horarios;
  }

  const agora = horaAtualMinutos();
  return horarios.filter((horario) => horarioParaMinutos(horario) > agora);
}

function proximosDias(quantidade = 5, deslocamentoDias = 0) {
  const dias = [];
  const [ano, mes, dia] = hojeIso().split('-').map(Number);
  const hoje = new Date(Date.UTC(ano, mes - 1, dia + deslocamentoDias, 12));

  for (let i = 0; dias.length < quantidade; i++) {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() + i);

    const diaSemana = data.getDay();
    if (diaSemana === 0) continue;

    dias.push(data.toISOString().slice(0, 10));
  }

  return dias;
}

async function enviarDiasDisponiveis(telefone, paginaDias = 0) {
  const deslocamentoDias = paginaDias * 7;
  const dias = proximosDias(5, deslocamentoDias);
  const lista = dias.map((dia, indice) => ({
    id: String(indice + 1),
    title: formatarData(dia)
  }));

  lista.push({
    id: 'proxima_semana',
    title: 'Proxima semana'
  });

  atualizarDados(telefone, { dias, paginaDias });
  atualizarEtapa(telefone, 'escolhendo_dia');

  return enviarMensagemInterativa(telefone, criarListaInterativa({
    texto: '*Escolha o dia*',
    botao: 'Ver dias',
    titulo: 'Datas disponiveis',
    linhas: lista
  }));
}

async function enviarMenu(telefone) {
  atualizarEtapa(telefone, 'menu');
  await enviarMensagemInterativa(telefone, criarListaInterativa({
    texto: '💈 *Barbearia do vitinho*\n\nComo podemos ajudar?',
    botao: 'Abrir menu',
    titulo: 'Atendimento',
    linhas: [
      { id: '1', title: '📅 Agendar horario' },
      { id: '2', title: '💇‍♂️ Ver servicos' },
      { id: '3', title: '⏰ Meus agendamentos' },
      { id: '4', title: '❌ Cancelar agendamento' },
      { id: '0', title: '🏠 Encerrar' }
    ]
  }));
}

async function enviarServicos(telefone) {
  const servicos = await listarServicos();

  if (!servicos.length) {
    await enviarMensagemTexto(telefone, 'Nenhum servico cadastrado.');
    return enviarMenu(telefone);
  }

  await enviarMensagemInterativa(telefone, criarListaInterativa({
    texto: '*Servicos disponiveis*\n\nEscolha uma opcao para continuar.',
    botao: 'Ver servicos',
    titulo: 'Servicos',
    linhas: servicos.map((servico) => ({
      id: String(servico.id),
      title: limitarTitulo(servico.nome),
      description: `R$ ${Number(servico.preco).toFixed(2)}`
    }))
  }));
}

async function enviarServicosComoConsulta(telefone) {
  const servicos = await listarServicos();

  if (!servicos.length) {
    return enviarMensagemTexto(telefone, 'Nenhum servico cadastrado.');
  }

  const texto = servicos
    .map((servico) => `- ${servico.nome}: R$ ${Number(servico.preco).toFixed(2)} (${servico.duracao_minutos} min)`)
    .join('\n');

  await enviarMensagemTexto(telefone, `*Servicos disponiveis:*\n\n${texto}`);

  return enviarOpcoesNavegacao(telefone);
}

async function enviarOpcoesNavegacao(telefone) {
  return enviarMensagemInterativa(telefone, criarListaInterativa({
    texto: 'Deseja voltar ao menu principal?',
    botao: 'Opcoes',
    titulo: 'Navegacao',
    linhas: [
      {
        id: 'menu',
        title: 'Voltar ao menu'
      },
      {
        id: '0',
        title: 'Encerrar'
      }
    ]
  }));
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
      return;
    }

    if (texto === '2') {
      return enviarServicosComoConsulta(telefone);
    }

    if (texto === '3') {
      const agendamentos = await listarAgendamentosCliente(telefone);

      if (!agendamentos.length) {
        await enviarMensagemTexto(telefone, 'Voce ainda nao possui agendamentos.');
        return enviarOpcoesNavegacao(telefone);
      }

      const lista = agendamentos
        .map((item, indice) => `${indice + 1} - ${formatarData(item.data)} as ${String(item.horario).slice(0, 5)} com ${item.barbeiro}`)
        .join('\n');

      await enviarMensagemTexto(telefone, `*Seus agendamentos:*\n\n${lista}`);
      return enviarOpcoesNavegacao(telefone);
    }

    if (texto === '4') {
      const agendamentos = await listarAgendamentosCliente(telefone);

      if (!agendamentos.length) {
        await enviarMensagemTexto(telefone, 'Voce nao possui agendamentos para cancelar.');
        return enviarMenu(telefone);
      }

      const lista = agendamentos
        .map((item) => ({
          id: String(item.id),
          title: `ID ${item.id}`,
          description: `${formatarData(item.data)} as ${String(item.horario).slice(0, 5)} com ${item.barbeiro}`
        }));

      atualizarEtapa(telefone, 'cancelando_agendamento');
      return enviarMensagemInterativa(telefone, criarListaInterativa({
        texto: '*Cancelar agendamento*\n\nEscolha qual agendamento deseja cancelar.',
        botao: 'Agendamentos',
        titulo: 'Seus horarios',
        linhas: lista
      }));
    }

    return enviarMenu(telefone);
  }

  if (sessao.etapa === 'cancelando_agendamento') {
    const cancelado = await cancelarAgendamentoCliente(Number(texto), telefone);
    await enviarMensagemTexto(telefone, cancelado ? 'Agendamento cancelado com sucesso.' : 'Agendamento nao encontrado ou nao pertence ao seu telefone.');
    return enviarMenu(telefone);
  }

  if (sessao.etapa === 'escolhendo_servico') {
    const servico = await buscarServicoPorId(Number(texto));

    if (!servico) {
      return enviarMensagemTexto(telefone, 'Servico nao encontrado. Digite um numero valido.');
    }

    atualizarDados(telefone, { servico });

    const barbeiros = await listarBarbeiros();
    const lista = barbeiros.map((barbeiro) => ({
      id: String(barbeiro.id),
      title: limitarTitulo(barbeiro.nome)
    }));

    atualizarEtapa(telefone, 'escolhendo_barbeiro');
    return enviarMensagemInterativa(telefone, criarListaInterativa({
      texto: '*Escolha o barbeiro*',
      botao: 'Ver barbeiros',
      titulo: 'Profissionais',
      linhas: lista
    }));
  }

  if (sessao.etapa === 'escolhendo_barbeiro') {
    const barbeiro = await buscarBarbeiroPorId(Number(texto));

    if (!barbeiro) {
      return enviarMensagemTexto(telefone, 'Barbeiro nao encontrado. Digite um numero valido.');
    }

    atualizarDados(telefone, { barbeiro });

    return enviarDiasDisponiveis(telefone);
  }

  if (sessao.etapa === 'escolhendo_dia') {
    if (texto === 'proxima_semana') {
      return enviarDiasDisponiveis(telefone, (sessao.dados.paginaDias || 0) + 1);
    }

    const indice = Number(texto) - 1;
    const data = sessao.dados.dias?.[indice];

    if (!data) {
      return enviarMensagemTexto(telefone, 'Dia invalido. Digite uma opcao da lista.');
    }

    const ocupados = await buscarHorariosOcupados(sessao.dados.barbeiro.id, data);
    const horariosDisponiveis = HORARIOS_PADRAO.filter((horario) => !ocupados.includes(horario));
    const livres = filtrarHorariosFuturos(data, horariosDisponiveis);

    if (!livres.length) {
      return enviarMensagemTexto(telefone, 'Nao ha horarios livres nesse dia. Digite menu para voltar.');
    }

    atualizarDados(telefone, { data, horarios: livres });
    atualizarEtapa(telefone, 'escolhendo_horario');

    const lista = livres.map((horario, indiceHorario) => ({
      id: String(indiceHorario + 1),
      title: horario
    }));
    return enviarMensagemInterativa(telefone, criarListaInterativa({
      texto: '*Escolha o horario*',
      botao: 'Ver horarios',
      titulo: 'Horarios livres',
      linhas: lista
    }));
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
