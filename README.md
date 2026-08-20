# Barbearia Bot

Sistema backend para agendamento de horarios em barbearias pelo WhatsApp.

O projeto permite que clientes agendem horarios de forma automatizada e que o administrador acompanhe e controle a agenda pelo proprio WhatsApp.

## Objetivo

Automatizar o processo de agendamento de uma barbearia, reduzindo o atendimento manual e evitando conflitos de horarios.

## Tecnologias

- Node.js
- Express.js
- PostgreSQL
- WhatsApp Cloud API

## Como Funciona

O sistema recebe mensagens pelo webhook do WhatsApp e identifica o telefone de quem enviou a mensagem.

Se o numero for do administrador, o sistema abre o fluxo administrativo. Caso contrario, abre o fluxo do cliente.

```txt
WhatsApp
-> Webhook
-> Roteador por telefone
-> Fluxo Cliente ou Fluxo Administrador
-> PostgreSQL
```

## Fluxo Do Cliente

O cliente pode:

- ver servicos;
- escolher barbeiro;
- escolher data;
- escolher horario disponivel;
- confirmar agendamento;
- consultar seus agendamentos;
- cancelar agendamento.

## Fluxo Do Administrador

O administrador pode:

- ver agenda por data;
- bloquear horario;
- liberar horario;
- cancelar agendamento.

O numero do administrador e configurado pela variavel `WHATSAPP_ADMIN_PHONE`.

## Estrutura Do Projeto

```txt
src/
|-- servidor.js
|-- nucleo/
|   |-- webhook.js
|   |-- roteadorFluxo.js
|   `-- contextoBot.js
|-- fluxos/
|   |-- fluxoCliente.js
|   `-- fluxoAdministrador.js
|-- servicos/
|   `-- clienteWhatsApp.js
|-- dados/
|   |-- bancoAgendamentos.js
|   |-- bancoClientes.js
|   |-- bancoServicos.js
|   `-- bancoBarbeiros.js
`-- config/
    `-- bancoDados.js
```

## Banco De Dados

O banco possui tabelas para:

- clientes;
- barbeiros;
- servicos;
- agendamentos.

A tabela de agendamentos impede que o mesmo barbeiro tenha dois horarios iguais no mesmo dia.

## Variaveis De Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
PORT=3000
DATABASE_URL=postgresql://usuario:senha@localhost:5432/barbearia
WHATSAPP_TOKEN=seu_token_aqui
WHATSAPP_PHONE_NUMBER_ID=seu_id_aqui
WEBHOOK_VERIFY_TOKEN=seu_verify_token_aqui
WHATSAPP_ADMIN_PHONE=5522999999999
```

## Como Executar

Instale as dependencias:

```bash
npm install
```

Execute o arquivo `schema.sql` no PostgreSQL.

Inicie o servidor:

```bash
npm start
```

## Rotas

```txt
GET  /          Teste do servidor
GET  /webhook   Validacao do webhook
POST /webhook   Recebimento de mensagens
```
