import 'dotenv/config';
import axios from 'axios';

function somenteNumeros(valor = '') {
  return String(valor).replace(/\D/g, '');
}

export async function enviarMensagemTexto(telefone, texto) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.log('[WhatsApp simulado]', telefone, texto);
    return;
  }

  const destino = somenteNumeros(telefone);

  await axios.post(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      to: destino,
      type: 'text',
      text: { body: texto }
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
}
