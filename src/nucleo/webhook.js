import { rotearFluxo } from './roteadorFluxo.js';

function extrairTexto(message) {
  return (
    message?.text?.body ||
    message?.interactive?.button_reply?.id ||
    message?.interactive?.list_reply?.id ||
    ''
  );
}

export function verificarWebhook(req, res) {
  const modo = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const desafio = req.query['hub.challenge'];

  if (modo === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(desafio);
  }

  return res.sendStatus(403);
}

export async function receberMensagem(req, res) {
  try {
    const entradas = req.body?.entry || [];

    for (const entrada of entradas) {
      const mudancas = entrada?.changes || [];

      for (const mudanca of mudancas) {
        const mensagens = mudanca?.value?.messages || [];

        for (const message of mensagens) {
          const texto = extrairTexto(message);
          const telefone = message?.from;

          if (!telefone || !texto) continue;

          await rotearFluxo({
            de: telefone,
            texto,
            id: message.id
          });
        }
      }
    }

    return res.sendStatus(200);
  } catch (erro) {
    console.error('[Webhook] Erro ao processar mensagem:', erro);
    return res.sendStatus(500);
  }
}
