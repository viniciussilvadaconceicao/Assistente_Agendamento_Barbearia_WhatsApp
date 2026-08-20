# Barbearia Bot

> Sistema de agendamento automatizado e gestão operacional para barbearias via WhatsApp Cloud API.

O **Barbearia Bot** é uma aplicação backend em Node.js que centraliza o atendimento ao cliente e a gestão do estabelecimento dentro do WhatsApp, eliminando a necessidade de aplicativos externos ou painéis web intermediários.

---

## 🛠️ Tecnologias Utilizadas

- **Linguagem / Runtime:** Node.js (JavaScript)
- **Framework Web:** Express.js
- **Banco de Dados:** PostgreSQL
- **Integração Externa:** WhatsApp Cloud API (Meta)

---

## 🎯 Objetivo e Funcionamento

O sistema reduz a intervenção manual em agendamentos, resolvendo problemas de atraso no atendimento e conflitos de horários.

A aplicação utiliza um **roteador por telefone** no Webhook do WhatsApp:

* **Fluxo Cliente:** Permite consultar catálogo de serviços, selecionar barbeiro, consultar horários disponíveis em tempo real e confirmar o agendamento no banco de dados.
* **Fluxo Administrador:** Reconhece automaticamente o número do gestor (configurado via variável de ambiente) e libera comandos para consulta de agenda, bloqueio/liberação de horários e cancelamentos.

---

## 📂 Organização do Código (`src/`)

- `servidor.js`: Inicialização do servidor HTTP Express.
- `nucleo/`: Webhook, roteamento de mensagens por telefone e gestão de contexto do bot.
- `fluxos/`: Lógica de conversa do Cliente e do Administrador.
- `servicos/`: Comunicação com a API do WhatsApp.
- `dados/`: Camada de acesso e persistência no PostgreSQL (Agendamentos, Clientes, Serviços, Barbeiros).
- `config/`: Conexão com o banco de dados.

---

## ⚙️ Configuração do Ambiente

Crie um arquivo `.env` na raiz do projeto contendo:

```env
PORT=3000
DATABASE_URL=postgresql://usuario:senha@localhost:5432/barbearia
WHATSAPP_TOKEN=seu_token_aqui
WHATSAPP_PHONE_NUMBER_ID=seu_id_aqui
WEBHOOK_VERIFY_TOKEN=seu_verify_token_aqui
WHATSAPP_ADMIN_PHONE=5522999999999