import 'dotenv/config';
import express from 'express';
import { verificarWebhook, receberMensagem } from './nucleo/webhook.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.get('/', (req, res) => {
  res.send('Barbearia Bot em execucao.');
});

app.get('/webhook', verificarWebhook);
app.post('/webhook', receberMensagem);

app.listen(port, () => {
  console.log(`[Servidor] Barbearia Bot rodando na porta ${port}`);
});
