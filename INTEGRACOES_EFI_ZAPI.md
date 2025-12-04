# 🔌 Integrações EFI e Z-API - MK-Edge Backend

## 📋 Visão Geral

Sistema completo de integração com **EFI (Gerencianet)** para pagamentos via Pix/Boleto e **Z-API** para notificações via WhatsApp, com interface administrativa centralizada para configuração por tenant.

---

## 🏗️ Arquitetura

### Componentes Principais

```
src/app/
├── controllers/
│   ├── IntegrationController.js     (NOVO) - Gerencia configurações
│   ├── SubscriptionController.js    - Usa EFI e Z-API
│   ├── WebhookController.js         - Recebe webhooks EFI/Z-API
│   └── SignupController.js          - Sistema de cadastro
├── helpers/
│   ├── EfiService.js                - Cliente EFI (Gerencianet)
│   └── ZApiService.js               - Cliente Z-API (WhatsApp)
├── jobs/
│   └── BillingJob.js                - Usa Z-API para notificações
└── schemas/
    └── Tenant.js                    - Armazena credenciais

public/admin/
└── dashboard.html                   - Interface administrativa
```

---

## 🔐 EfiService - Pagamentos

### Funcionalidades

✅ **Autenticação OAuth2**
- Token automático com renovação
- Suporte a certificado .p12
- Sandbox e Produção

✅ **Cobranças Pix**
- Geração de QR Code
- Pix Copia e Cola
- Configuração de expiração
- Consulta de status

✅ **Boletos Bancários**
- Geração de boleto
- Código de barras
- Link de pagamento
- Consulta de status

✅ **Webhooks**
- Configuração automática
- Processamento de pagamentos
- Atualização de status

### Métodos Disponíveis

```javascript
const efi = new EfiService({
  client_id: 'CLIENT_ID',
  client_secret: 'CLIENT_SECRET',
  certificate: '/path/to/cert.p12',
  sandbox: true
});

// Autenticação
await efi.authenticate();

// Criar cobrança Pix
const pix = await efi.createPixCharge({
  txid: 'UNIQUE_ID',
  valor: 99.90,
  devedor: {
    cnpj: '12345678000190',
    nome: 'Cliente Teste'
  },
  expiracao: 3600,
  descricao: 'Assinatura Mensal'
});

// Criar boleto
const boleto = await efi.createBoleto({
  valor: 99.90,
  devedor: {
    nome: 'Cliente Teste',
    cnpj: '12345678000190',
    email: 'cliente@exemplo.com',
    telefone: '1199999999'
  },
  vencimento: '2024-12-31',
  descricao: 'Assinatura Mensal'
});

// Consultar status
const status = await efi.getPixCharge('TXID');

// Cancelar cobrança
await efi.cancelPixCharge('TXID');

// Configurar webhook
await efi.configureWebhook('https://seu-dominio.com/webhook/efi/pix', 'CHAVE_PIX');
```

### Resposta Pix

```javascript
{
  txid: "c3f4a5b6c7d8e9f0",
  status: "ATIVA",
  pixCopiaECola: "00020126...999",
  qrcode: "https://...",
  qrcodeImage: "data:image/png;base64,...",
  valor: "99.90",
  expiracao: 3600
}
```

---

## 💬 ZApiService - WhatsApp

### Funcionalidades

✅ **Mensagens de Texto**
- Envio simples
- Formatação Markdown
- Templates prontos

✅ **Mensagens com Mídia**
- Imagens
- Documentos/PDF
- Links com preview

✅ **Verificação**
- Status da instância
- Conexão ativa
- Queue status

✅ **Templates Prontos**
- Boas-vindas
- Lembretes de vencimento
- Confirmação de pagamento
- Avisos de suspensão
- Pix gerado

### Métodos Disponíveis

```javascript
const zapi = new ZApiService({
  instance: 'INSTANCE_ID',
  token: 'TOKEN',
  client_token: 'CLIENT_TOKEN'
});

// Enviar texto
await zapi.sendText('5511999999999', 'Olá! Sua mensagem aqui');

// Enviar imagem
await zapi.sendImage(
  '5511999999999',
  'https://exemplo.com/imagem.jpg',
  'Legenda da imagem'
);

// Enviar documento
await zapi.sendDocument(
  '5511999999999',
  'https://exemplo.com/doc.pdf',
  'documento.pdf',
  'Descrição do arquivo'
);

// Enviar link com preview
await zapi.sendLink(
  '5511999999999',
  'Confira nosso site',
  'https://exemplo.com',
  'Título do Link',
  'Descrição do link',
  'https://exemplo.com/thumb.jpg'
);

// Verificar status
const status = await zapi.getStatus();

// Usar templates
await zapi.sendText(
  '5511999999999',
  zapi.templates.lembreteVencimento('João', 3, 99.90, 'https://pay.link')
);
```

### Templates Disponíveis

```javascript
// Boas-vindas
zapi.templates.boasVindas(nome, plano)

// Lembrete de vencimento
zapi.templates.lembreteVencimento(nome, dias, valor, linkPagamento)

// Fatura paga
zapi.templates.faturaPaga(nome, valor, dataProximo)

// Fatura vencida
zapi.templates.faturaVencida(nome, dias, valor, linkPagamento)

// Serviço suspenso
zapi.templates.servicoSuspenso(nome)

// Pix gerado
zapi.templates.pixGerado(nome, valor, pixCopiaECola)
```

---

## 🎛️ IntegrationController - API REST

### Endpoints Disponíveis

#### 📊 Visualizar Configurações
```http
GET /admin/integration/:tenant_id
Authorization: Bearer {token}
```

Resposta:
```json
{
  "efi": {
    "configured": true,
    "sandbox": false
  },
  "zapi": {
    "configured": true,
    "instance": "instance123"
  },
  "notifications": {
    "whatsapp_enabled": true,
    "email_enabled": true,
    "dias_aviso_vencimento": [7, 3, 1]
  }
}
```

#### 🔧 Configurar EFI
```http
POST /admin/integration/:tenant_id/efi
Authorization: Bearer {token}
Content-Type: application/json

{
  "client_id": "CLIENT_ID",
  "client_secret": "CLIENT_SECRET",
  "certificate": "/path/to/cert.p12",
  "pix_key": "email@exemplo.com",
  "sandbox": true
}
```

#### ✅ Testar EFI
```http
POST /admin/integration/:tenant_id/efi/test
Authorization: Bearer {token}
```

#### 🔧 Configurar Z-API
```http
POST /admin/integration/:tenant_id/zapi
Authorization: Bearer {token}
Content-Type: application/json

{
  "instance": "instance123",
  "token": "TOKEN",
  "client_token": "CLIENT_TOKEN"
}
```

#### ✅ Testar Z-API
```http
POST /admin/integration/:tenant_id/zapi/test
Authorization: Bearer {token}
```

#### 📱 Enviar Mensagem de Teste
```http
POST /admin/integration/:tenant_id/test-message
Authorization: Bearer {token}
Content-Type: application/json

{
  "phone": "5511999999999",
  "message": "Mensagem de teste opcional"
}
```

#### 🔔 Configurar Notificações
```http
POST /admin/integration/:tenant_id/notifications
Authorization: Bearer {token}
Content-Type: application/json

{
  "whatsapp_enabled": true,
  "email_enabled": true,
  "dias_aviso_vencimento": [7, 3, 1]
}
```

#### 🗑️ Remover Integração
```http
DELETE /admin/integration/:tenant_id
Authorization: Bearer {token}
Content-Type: application/json

{
  "integration": "efi"  // ou "zapi"
}
```

---

## 🖥️ Interface Administrativa

### Acesso

1. Login no dashboard admin: `http://seu-dominio/admin/`
2. Navegue até a lista de clientes
3. Clique no botão **🔌 Integrações** (roxo) de cada tenant

### Abas Disponíveis

#### 1️⃣ EFI (Pagamentos)

**Campos:**
- Client ID *
- Client Secret *
- Caminho do Certificado (.p12) *
- Chave PIX
- Modo Sandbox (checkbox)

**Ações:**
- 💾 Salvar - Salva credenciais
- ✅ Testar Conexão - Valida autenticação
- 🗑️ Remover - Remove configuração

#### 2️⃣ Z-API (WhatsApp)

**Campos:**
- Instância *
- Token *
- Client Token *

**Ações:**
- 💾 Salvar - Salva credenciais
- ✅ Testar Conexão - Valida conexão
- 📤 Enviar Teste - Envia mensagem de teste
- 🗑️ Remover - Remove configuração

#### 3️⃣ Notificações

**Configurações:**
- 📱 Notificações via WhatsApp (toggle)
- 📧 Notificações via E-mail (toggle)
- 📅 Dias para Aviso de Vencimento (ex: 7,3,1)

**Ações:**
- 💾 Salvar Configurações

---

## 🔄 Fluxo de Pagamento Completo

### 1. Geração de Fatura

```javascript
// SubscriptionController.generateInvoice()
const invoice = await Invoice.create({
  tenant_id,
  subscription_id,
  numero_fatura: `INV-${Date.now()}-${uuid}`,
  valor: subscription.valor,
  data_vencimento,
  status: 'pending'
});

// Gera Pix na EFI
const pixCharge = await efi.createPixCharge({...});

// Atualiza fatura
invoice.efi_txid = pixCharge.txid;
invoice.efi_pix_qrcode = pixCharge.pixCopiaECola;
await invoice.save();

// Envia WhatsApp
await zapi.sendText(
  tenant.contato,
  zapi.templates.pixGerado(nome, valor, pixCopiaECola)
);
```

### 2. Recebimento de Webhook

```javascript
// WebhookController.efiPix()
const { pix } = req.body;

// Busca fatura pelo txid
const invoice = await Invoice.findOne({ efi_txid: txid });

// Atualiza status
invoice.status = 'paid';
invoice.data_pagamento = new Date();
await invoice.save();

// Atualiza assinatura
subscription.status = 'active';
subscription.proximo_vencimento = addMonths(vencimento, 1);
await subscription.save();

// Envia confirmação
await zapi.sendText(
  tenant.contato,
  zapi.templates.faturaPaga(nome, valor, proximaData)
);
```

### 3. Job de Cobrança Automática

```javascript
// BillingJob.handle()
const subscriptions = await Subscription.find({
  proximo_vencimento: { $lte: tomorrow }
});

for (const sub of subscriptions) {
  // Gera fatura
  const invoice = await generateInvoice(sub);
  
  // Gera Pix
  const pix = await efi.createPixCharge({...});
  
  // Envia WhatsApp
  await zapi.sendText(
    tenant.contato,
    zapi.templates.lembreteVencimento(...)
  );
}
```

---

## 📦 Schema do Tenant

### Campos de Integração

```javascript
// Tenant.js (MongoDB Schema)
{
  // EFI (Gerencianet)
  efi_client_id: String,
  efi_client_secret: String,
  efi_certificate: String,      // Caminho do .p12
  efi_pix_key: String,           // Chave Pix
  efi_sandbox: Boolean,          // true = sandbox
  
  // Z-API (WhatsApp)
  zapi_instance: String,
  zapi_token: String,
  zapi_client_token: String,
  
  // Notificações
  notificacoes: {
    whatsapp_enabled: Boolean,
    email_enabled: Boolean,
    dias_aviso_vencimento: [Number]  // ex: [7, 3, 1]
  }
}
```

---

## 🚀 Como Usar

### 1. Obter Credenciais EFI

1. Acesse: https://gerencianet.com.br
2. Crie uma aplicação
3. Obtenha Client ID e Client Secret
4. Baixe o certificado .p12
5. Configure sua chave Pix

### 2. Obter Credenciais Z-API

1. Acesse: https://z-api.io
2. Crie uma instância
3. Conecte seu WhatsApp
4. Copie: Instance ID, Token e Client Token

### 3. Configurar no Dashboard

1. Login no admin
2. Clique em 🔌 Integrações no cliente desejado
3. Preencha as credenciais nas abas EFI e Z-API
4. Teste as conexões
5. Configure as notificações
6. Salve tudo

### 4. Ativar Cobranças Automáticas

```bash
# Inicie o job de cobrança
npm run queue
```

O sistema automaticamente:
- Gera faturas próximas ao vencimento
- Cria cobranças Pix
- Envia notificações WhatsApp
- Processa webhooks de pagamento
- Atualiza status das assinaturas

---

## 🧪 Testes

### Testar EFI (Sandbox)

```javascript
// Use o modo sandbox
efi_sandbox: true

// Dados de teste EFI:
// CPF: 94271564656
// CNPJ: 12345678000190
```

### Testar Z-API

```javascript
// Enviar mensagem de teste
POST /admin/integration/:tenant_id/test-message
{
  "phone": "5511999999999"
}
```

---

## ⚠️ Requisitos

### Ambiente

- ✅ Node.js 18+
- ✅ MongoDB (credenciais armazenadas)
- ✅ Redis (jobs/queue)
- ✅ Certificado EFI (.p12)
- ✅ WhatsApp conectado (Z-API)

### NPM Packages

```json
{
  "axios": "^1.6.0",
  "https": "^1.0.0",
  "fs": "^0.0.1-security"
}
```

---

## 🔒 Segurança

### Boas Práticas

✅ **Credenciais**
- Armazenadas em MongoDB (criptografadas em produção)
- Nunca no código-fonte
- Acesso apenas via API autenticada

✅ **Certificado EFI**
- Caminho absoluto no servidor
- Permissões restritas (600)
- Backup seguro

✅ **Webhooks**
- Validação de origem
- Logs de todas as transações
- Verificação de assinatura (quando disponível)

✅ **API REST**
- Todas as rotas protegidas com JWT
- Apenas admin pode configurar
- Rate limiting aplicado

---

## 📊 Monitoramento

### Logs

```bash
# Logs do servidor
tail -f /srv/mk-auth-support-app-backend/server.log

# Buscar erros EFI
grep "EFI" server.log

# Buscar erros Z-API
grep "Z-API" server.log
```

### Status no Dashboard

- Badge verde = Configurado e testado
- Badge amarelo = Não configurado
- Badge vermelho = Erro na configuração

---

## 🐛 Troubleshooting

### EFI não autentica

```
Erro: Falha na autenticação EFI
```

**Soluções:**
1. Verificar Client ID e Client Secret
2. Verificar caminho do certificado (.p12)
3. Verificar permissões do arquivo
4. Testar no sandbox primeiro

### Z-API não envia mensagens

```
Erro: Falha ao enviar WhatsApp
```

**Soluções:**
1. Verificar se instância está conectada
2. Testar com /zapi/test
3. Verificar formato do número (55DDNNNNNNNNN)
4. Verificar limites de envio da Z-API

### Webhook não recebe pagamentos

**Soluções:**
1. Verificar URL pública do webhook
2. Configurar webhook na EFI: `/admin/integration/:id/efi`
3. Verificar logs: `grep "Webhook EFI" server.log`
4. Testar com Postman (simular webhook)

---

## 📚 Documentação Oficial

- **EFI:** https://dev.gerencianet.com.br
- **Z-API:** https://developer.z-api.io

---

## ✅ Checklist de Implementação

- [x] EfiService com OAuth2
- [x] ZApiService com templates
- [x] IntegrationController (CRUD)
- [x] Interface administrativa (modal)
- [x] Rotas API REST protegidas
- [x] Schema Tenant atualizado
- [x] Webhooks EFI implementados
- [x] Webhooks Z-API implementados
- [x] Job de cobrança automática
- [x] Templates de mensagens WhatsApp
- [x] Testes de conexão (EFI/Z-API)
- [x] Documentação completa

---

## 🎯 Próximos Passos

1. **Implementar email notifications** (adicionar SendGrid/Nodemailer)
2. **Dashboard de métricas** (pagamentos, mensagens enviadas)
3. **Histórico de transações** (visualizar todos os webhooks)
4. **Multi-gateway** (adicionar Stripe, PagSeguro, etc)
5. **Templates customizáveis** (editor de mensagens no admin)

---

**Desenvolvido para MK-Edge v3.0**
*Sistema completo de gestão de assinaturas e suporte técnico*
