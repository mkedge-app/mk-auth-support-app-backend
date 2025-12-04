# 🚀 Sistema de Assinatura e Cobrança Automática

Sistema completo de gerenciamento de assinaturas integrado com **EFI (Gerencianet)** para pagamentos e **Z-API** para notificações WhatsApp.

## 📋 Funcionalidades Implementadas

### 1. **Schemas MongoDB**
- ✅ `Tenant` - Atualizado com campos para EFI e Z-API
- ✅ `Subscription` - Gerenciamento de assinaturas
- ✅ `Invoice` - Faturas e histórico de pagamentos

### 2. **Integrações**
- ✅ **EfiService** - Integração completa com EFI
  - Criação de Pix com QR Code
  - Geração de boletos bancários
  - Consulta de status
  - Webhooks automáticos
  
- ✅ **ZApiService** - Integração com Z-API
  - Envio de mensagens WhatsApp
  - Templates prontos (boas-vindas, lembretes, confirmações)
  - Envio de imagens (QR Code)

### 3. **Controllers**
- ✅ `SubscriptionController` - Gerenciamento completo de assinaturas
- ✅ `WebhookController` - Recebe notificações da EFI

### 4. **Jobs Automáticos**
- ✅ `BillingJob` - Executa diariamente:
  - Gera faturas automaticamente
  - Envia lembretes de vencimento (7, 3, 1 dia antes)
  - Suspende assinaturas vencidas
  - Envia notificações de cobrança

### 5. **Rotas API**

#### Assinaturas
```
GET    /subscriptions                    - Lista todas assinaturas
GET    /subscription/:id                 - Detalhes de uma assinatura
POST   /subscription                     - Cria nova assinatura
POST   /subscription/:id/invoice         - Gera fatura
POST   /subscription/:id/cancel          - Cancela assinatura
POST   /subscription/:id/suspend         - Suspende assinatura
POST   /subscription/:id/reactivate      - Reativa assinatura
```

#### Webhooks
```
POST   /webhook/efi/pix                  - Webhook EFI (Pix)
POST   /webhook/efi/boleto               - Webhook EFI (Boleto)
POST   /webhook/zapi                     - Webhook Z-API
```

## ⚙️ Configuração

### 1. Instalar dependências adicionais

```bash
npm install uuid
```

### 2. Configurar variáveis de ambiente

Crie/atualize o arquivo `.env`:

```env
# URL da aplicação
APP_URL=https://api.seudominio.com.br
FRONTEND_URL=https://app.seudominio.com.br

# EFI (Gerencianet)
EFI_CLIENT_ID=seu_client_id_aqui
EFI_CLIENT_SECRET=seu_client_secret_aqui
EFI_CERTIFICATE_PATH=/caminho/para/certificado.p12
EFI_SANDBOX=false
EFI_PIX_KEY=sua_chave_pix_aqui

# Z-API (WhatsApp)
ZAPI_INSTANCE=seu_instance_id
ZAPI_TOKEN=seu_token
ZAPI_CLIENT_TOKEN=seu_client_token
WHATSAPP_DEFAULT_PHONE=5511999999999

# Notificações
EMAIL_ENABLED=false
WHATSAPP_ENABLED=true

# Job de cobrança
BILLING_JOB_ENABLED=true
BILLING_JOB_SCHEDULE=0 8 * * *
```

### 3. Configurar Webhooks na EFI

Acesse o painel da EFI e configure:

**Webhook Pix:**
```
https://api.seudominio.com.br/webhook/efi/pix
```

**Webhook Boleto:**
```
https://api.seudominio.com.br/webhook/efi/boleto
```

### 4. Configurar Webhook na Z-API

No painel da Z-API, configure:
```
https://api.seudominio.com.br/webhook/zapi
```

### 5. Executar o Job de Cobrança

Adicione ao crontab ou use um agendador:

```bash
# Executa diariamente às 8h
0 8 * * * node /caminho/do/projeto/src/app/jobs/BillingJob.js
```

Ou use o próprio Node:

```javascript
// No arquivo server.js ou app.js
import cron from 'node-cron';
import BillingJob from './app/jobs/BillingJob';

// Executa diariamente às 8h
cron.schedule('0 8 * * *', async () => {
  await BillingJob.handle();
});
```

## 🔄 Fluxo de Funcionamento

### 1. **Novo Cliente**
1. Cliente se cadastra no sistema
2. Assinatura é criada (pode ter período trial)
3. WhatsApp de boas-vindas é enviado

### 2. **Cobrança Mensal**
1. Job gera fatura 5 dias antes do vencimento
2. Pix/Boleto é criado automaticamente na EFI
3. WhatsApp com link de pagamento é enviado

### 3. **Lembretes**
1. 7 dias antes: primeiro lembrete
2. 3 dias antes: segundo lembrete
3. 1 dia antes: último lembrete

### 4. **Pagamento Confirmado**
1. EFI envia webhook de confirmação
2. Fatura é marcada como paga
3. Próximo vencimento é calculado
4. WhatsApp de confirmação é enviado

### 5. **Falta de Pagamento**
1. Após 3 dias de atraso: assinatura suspensa
2. Serviço é bloqueado
3. WhatsApp de suspensão é enviado

## 📊 Estrutura de Dados

### Tenant
```javascript
{
  cnpj, email, senha_hash, responsavel, contato,
  provedor: { nome, sis_provedor },
  database: { ... },
  assinatura: {
    status: 'trial' | 'active' | 'suspended' | 'cancelled',
    ativa: true/false,
    plano: 'mensal',
    valor: 100.00,
    dia_vencimento: 10,
    proximo_pagamento: Date,
    ultimo_pagamento: Date,
    metodo_pagamento: 'pix' | 'boleto'
  },
  efi_client_id, efi_client_secret, efi_certificate,
  zapi_instance, zapi_token, zapi_client_token,
  notificacoes: {
    whatsapp_enabled: true,
    email_enabled: false,
    dias_aviso_vencimento: [7, 3, 1]
  }
}
```

### Invoice
```javascript
{
  tenant_id, subscription_id,
  numero_fatura: 'INV-...',
  status: 'pending' | 'paid' | 'overdue' | 'cancelled',
  valor: 100.00,
  data_vencimento: Date,
  data_pagamento: Date,
  efi_txid, efi_pix_qrcode, efi_pix_qrcode_image,
  notificacoes_enviadas: [{ tipo, data_envio, status }],
  historico: [{ data, evento, descricao }]
}
```

## 🎯 Próximos Passos

1. **Criar Frontend do Dashboard**
   - Painel de controle para gerenciar tenants
   - Visualização de faturas e pagamentos
   - Relatórios e métricas

2. **Portal do Cliente**
   - Área de cadastro self-service
   - Visualização de faturas
   - Histórico de pagamentos
   - Atualização de dados

3. **Melhorias**
   - Integração com email (SendGrid, AWS SES)
   - Suporte a múltiplas formas de pagamento
   - Cupons de desconto
   - Programa de afiliados

## 📞 Suporte

Para dúvidas ou problemas:
- Email: suporte@mkedge.com.br
- WhatsApp: (11) 99999-9999

---

**Desenvolvido com ❤️ para MK-Edge**
