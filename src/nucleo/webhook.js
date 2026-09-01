import crypto from 'crypto';
import {
  registrarMensagemProcessada,
  removerMensagemProcessada
} from '../dados/bancoMensagensProcessadas.js';
import { rotearFluxo } from './roteadorFluxo.js';

function extrairTexto(message) {
  return (
    message?.text?.body ||
    message?.interactive?.button_reply?.id ||
    message?.interactive?.list_reply?.id ||
    ''
  );
}

function validarAssinaturaWebhook(req) {
  const appSecret = process.env.META_APP_SECRET;
  const assinaturaRecebida = req.headers['x-hub-signature-256'];

  if (!appSecret) {
    console.error('[Webhook] META_APP_SECRET nao configurado.');
    return false;
  }

  if (!assinaturaRecebida || !assinaturaRecebida.startsWith('sha256=')) {
    return false;
  }

  const assinaturaEsperada = `sha256=${crypto
    .createHmac('sha256', appSecret)
    .update(req.rawBody)
    .digest('hex')}`;

  const bufferRecebido = Buffer.from(assinaturaRecebida);
  const bufferEsperado = Buffer.from(assinaturaEsperada);

  return (
    bufferRecebido.length === bufferEsperado.length &&
    crypto.timingSafeEqual(bufferRecebido, bufferEsperado)
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
    if (!validarAssinaturaWebhook(req)) {
      console.warn('[Webhook] Assinatura invalida ou ausente.');
      return res.sendStatus(403);
    }

    const entradas = req.body?.entry || [];

    for (const entrada of entradas) {
      const mudancas = entrada?.changes || [];

      for (const mudanca of mudancas) {
        const mensagens = mudanca?.value?.messages || [];

        for (const message of mensagens) {
          const texto = extrairTexto(message);
          const telefone = message?.from;
          const idMensagem = message?.id;

          if (!telefone || !texto) continue;
          if (!idMensagem) {
            console.warn('[Webhook] Mensagem sem ID ignorada.');
            continue;
          }

          const mensagemNova = await registrarMensagemProcessada(idMensagem, telefone);

          if (!mensagemNova) {
            console.log(`[Webhook] Mensagem duplicada ignorada: ${idMensagem}`);
            continue;
          }

          try {
            await rotearFluxo({
              de: telefone,
              texto,
              id: idMensagem
            });
          } catch (erro) {
            await removerMensagemProcessada(idMensagem);
            throw erro;
          }
        }
      }
    }

    return res.sendStatus(200);
  } catch (erro) {
    console.error('[Webhook] Erro ao processar mensagem:', erro);
    return res.sendStatus(500);
  }
}
