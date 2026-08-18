# Sistema de Agendamento para Barbearia

Este projeto consiste no desenvolvimento de um sistema de agendamento
automatizado para barbearias, utilizando o WhatsApp como principal
canal de comunicação com o cliente.

A proposta é permitir que o cliente realize todo o processo de
agendamento através de uma conversa no WhatsApp, sem precisar acessar
um aplicativo específico.

O sistema é composto por duas interfaces principais:

1. Atendimento ao cliente pelo WhatsApp;
2. Painel administrativo para gerenciamento da barbearia.

O cliente pode consultar os serviços, escolher um barbeiro,
selecionar uma data e horário disponíveis e confirmar seu agendamento.

O administrador possui acesso às informações da agenda e pode
gerenciar os serviços, barbeiros e disponibilidade dos horários.

## Problema

Muitas barbearias ainda realizam seus agendamentos manualmente
através de mensagens, o que pode gerar problemas como:

- demora no atendimento;
- conflitos de horários;
- dificuldade para controlar a agenda;
- necessidade de responder repetidamente às mesmas perguntas;
- perda de informações durante a conversa.

O sistema busca reduzir esses problemas através da automação
do processo de agendamento.

## Solução

A solução utiliza o WhatsApp como interface de atendimento.

O cliente envia uma mensagem e o sistema conduz a conversa
através de um fluxo definido:

Cliente
   ↓
Escolhe serviço
   ↓
Escolhe barbeiro
   ↓
Escolhe data
   ↓
Consulta horários disponíveis
   ↓
Escolhe horário
   ↓
Confirma agendamento
   ↓
Agendamento salvo no banco
   ↓
Confirmação enviada pelo WhatsApp

## Arquitetura

O sistema foi dividido em módulos para separar as responsabilidades.

WhatsApp
   ↓
WhatsApp Cloud API
   ↓
Webhook
   ↓
Roteador de Fluxo
   ↓
Fluxo da Barbearia
   ↓
Camada de Dados
   ↓
PostgreSQL

Administrador
      ↓
Painel Administrativo
      ↓
Rotas
      ↓
Camada de Dados
      ↓
PostgreSQL
