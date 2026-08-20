const sessoes = new Map();

function normalizarTelefone(telefone = '') {
  return String(telefone).replace(/\D/g, '');
}

export function obterSessao(telefone) {
  const chave = normalizarTelefone(telefone);

  if (!sessoes.has(chave)) {
    sessoes.set(chave, {
      etapa: 'menu',
      dados: {}
    });
  }

  return sessoes.get(chave);
}

export function atualizarEtapa(telefone, etapa) {
  const sessao = obterSessao(telefone);
  sessao.etapa = etapa;
  return sessao;
}

export function atualizarDados(telefone, novosDados) {
  const sessao = obterSessao(telefone);
  sessao.dados = {
    ...sessao.dados,
    ...novosDados
  };
  return sessao;
}

export function limparSessao(telefone) {
  sessoes.delete(normalizarTelefone(telefone));
}
