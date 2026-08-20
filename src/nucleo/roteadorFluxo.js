import { fluxoCliente } from '../fluxos/fluxoCliente.js';
import { fluxoAdministrador } from '../fluxos/fluxoAdministrador.js';

function normalizarTelefone(telefone = '') {
  return String(telefone).replace(/\D/g, '');
}

export async function rotearFluxo(mensagem) {
  const telefoneAdmin = normalizarTelefone(process.env.WHATSAPP_ADMIN_PHONE);
  const telefoneMensagem = normalizarTelefone(mensagem.de);

  if (telefoneAdmin && telefoneMensagem === telefoneAdmin) {
    return fluxoAdministrador(mensagem);
  }

  return fluxoCliente(mensagem);
}
