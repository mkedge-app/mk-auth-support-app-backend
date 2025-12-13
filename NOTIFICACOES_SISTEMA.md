# Sistema de Notificações Automáticas

## 📋 Visão Geral

Sistema completo de notificações automáticas por WhatsApp e Email, com histórico, templates editáveis e envio agendado.

## 🎯 Funcionalidades

### 1. Templates de Mensagens
- **4 tipos de templates**: Boas-Vindas, Lembrete, Confirmação, Suspensão
- Templates editáveis pelo dashboard
- Suporte a variáveis dinâmicas
- Mensagens separadas para WhatsApp e Email
- Ativação/desativação individual

### 2. Envio Automático
- **Boas-Vindas**: Enviado no cadastro de novo cliente
- **Lembretes**: 3 dias antes do vencimento (cron diário às 9h)
- **Confirmação**: Quando pagamento é confirmado via webhook EFI
- **Suspensão**: Quando assinatura é cancelada

### 3. Histórico de Notificações
- Log completo de todas as mensagens
- Status: Enviada, Pendente, Falhada
- Filtros por tipo, status e canal
- Estatísticas de envios
- Reenvio manual
- Visualização de erros

### 4. Envio Manual
- Enviar mensagens personalizadas para clientes
- Seleção de canal (WhatsApp/Email)
- Preview antes do envio

## 🏗️ Arquitetura

### Backend (Node.js)

```
src/
├── app/
│   ├── controllers/
│   │   ├── MessageTemplateController.js    # CRUD de templates
│   │   ├── NotificationLogController.js    # Histórico e envio manual
│   │   ├── WebhookEfiController.js         # Integrado com notificações
│   │   └── SignupController.js             # Envia boas-vindas
│   ├── services/
│   │   └── NotificationService.js          # Lógica de envio
│   ├── jobs/
│   │   └── ReminderJob.js                  # Cron de lembretes
│   └── schemas/
│       ├── MessageTemplate.js              # Schema de templates
│       └── NotificationLog.js              # Schema de histórico
```

### Frontend (Dashboard)

```
dashboard/
├── index.html
│   ├── Seção: Notificações (Histórico)
│   └── Seção: Configurações > Mensagens (Templates)
├── app.js
│   ├── loadNotificationHistory()
│   ├── loadTemplates()
│   ├── saveTemplate()
│   └── sendManualNotification()
└── styles.css
```

## 📡 API Endpoints

### Templates de Mensagens

```bash
# Listar todos os templates
GET /admin/message-templates

# Criar/Atualizar template
POST /admin/message-templates
{
  "type": "welcome",
  "name": "Boas-Vindas",
  "subject": "Bem-vindo à MK Edge!",
  "whatsapp_message": "Olá {{nome}}! Bem-vindo...",
  "email_message": "<html>...",
  "trigger": "new_customer",
  "enabled": true,
  "variables": ["nome"]
}

# Buscar template específico
GET /admin/message-templates/:type

# Renderizar template com variáveis
POST /admin/message-templates/:type/render
{
  "nome": "Updata Telecom",
  "valor": "R$ 100,00"
}

# Deletar template
DELETE /admin/message-templates/:type
```

### Histórico de Notificações

```bash
# Listar histórico
GET /admin/notifications
Query: ?template_type=welcome&status=sent&channel=whatsapp&page=1&limit=50

# Criar log (interno)
POST /admin/notifications

# Atualizar status (interno)
PUT /admin/notifications/:id/status
{
  "status": "sent",
  "error_message": null
}

# Reenviar notificação
POST /admin/notifications/:id/resend

# Enviar mensagem manual
POST /admin/notifications/send-manual
{
  "tenant_id": "63dd998b885eb427c8c51958",
  "channel": "whatsapp",
  "recipient": "5511999999999",
  "recipient_name": "João Silva",
  "message": "Sua mensagem aqui"
}

# Deletar do histórico
DELETE /admin/notifications/:id
```

## 🔧 Configuração

### 1. Variáveis de Ambiente

```env
# Z-API (WhatsApp)
ZAPI_URL=https://api.z-api.io/instances/YOUR_INSTANCE
ZAPI_TOKEN=YOUR_TOKEN
ZAPI_CLIENT_TOKEN=YOUR_CLIENT_TOKEN

# SMTP (Email) - A implementar
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_password

# Webhook
WEBHOOK_SECRET=your_secret_token
```

### 2. Templates Padrão

#### Boas-Vindas
```
Olá {{nome}}! 🎉

Bem-vindo à MK Edge! Sua conta foi criada com sucesso.

Você tem 7 dias de teste grátis para conhecer todas as funcionalidades.

Acesse: http://mk-edge.com.br/portal

Qualquer dúvida, estamos à disposição!
```

#### Lembrete (3 dias antes)
```
Olá {{nome}}! 📅

Seu pagamento de {{valor}} vence em {{dias}} dias ({{vencimento}}).

Para evitar interrupções no serviço, realize o pagamento através do link:
{{link_pagamento}}

Obrigado!
```

#### Confirmação de Pagamento
```
Olá {{nome}}! ✅

Pagamento de {{valor}} confirmado!

Sua assinatura está ativa até {{vencimento}}.

Obrigado pela confiança!
```

#### Suspensão
```
Olá {{nome}}! ⚠️

Identificamos pagamento pendente de {{valor}}.

Para reativar seu acesso, realize o pagamento:
{{link_pagamento}}

Em caso de dúvidas, entre em contato.
```

## 🤖 Jobs Automáticos

### Lembretes de Vencimento

```javascript
// Executa diariamente às 9h
cron.schedule('0 9 * * *', async () => {
  // Busca assinaturas que vencem em 3 dias
  // Envia lembrete via WhatsApp
  // Loga resultado
});
```

**Lógica:**
1. Busca assinaturas com `next_due_date` entre hoje+3 e hoje+4
2. Ignora tenants com `cortesia: true`
3. Verifica se WhatsApp está habilitado
4. Renderiza template com dados da assinatura
5. Envia via Z-API
6. Cria log no histórico

### Executar Manualmente (Teste)

```bash
# Via código
import ReminderJob from './app/jobs/ReminderJob';
ReminderJob.runNow();
```

## 📊 Schema MongoDB

### MessageTemplate
```javascript
{
  type: String,              // welcome, reminder, confirmed, suspension
  name: String,
  subject: String,           // Para email
  whatsapp_message: String,
  email_message: String,
  trigger: String,           // new_customer, before_due_date, payment_confirmed, suspension
  variables: [String],       // ['nome', 'valor', 'vencimento']
  enabled: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### NotificationLog
```javascript
{
  tenant_id: ObjectId,
  template_type: String,     // welcome, reminder, confirmed, suspension, manual
  channel: String,           // whatsapp, email
  recipient: String,         // Phone or email
  recipient_name: String,
  message: String,
  status: String,            // pending, sent, failed
  sent_at: Date,
  error_message: String,
  metadata: {
    subscription_id: ObjectId,
    charge_id: String,
    invoice_amount: Number,
    due_date: Date,
    payment_link: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

## 🔄 Fluxo de Automação

### 1. Novo Cadastro
```
SignupController.store()
  → Cria tenant
  → NotificationService.sendWelcome()
    → Busca template 'welcome'
    → Renderiza com nome do tenant
    → Envia via Z-API
    → Cria log
```

### 2. Pagamento Confirmado
```
WebhookEfiController.handleChargePaid()
  → Atualiza subscription
  → Ativa tenant (se não cortesia)
  → NotificationService.sendConfirmation()
    → Busca template 'confirmed'
    → Renderiza com valor e vencimento
    → Envia via Z-API
    → Cria log
```

### 3. Lembrete Agendado
```
ReminderJob (cron 9h)
  → Busca subscriptions (vencimento em 3 dias)
  → Para cada:
    → Ignora cortesia
    → Verifica WhatsApp habilitado
    → NotificationService.sendReminder()
      → Busca template 'reminder'
      → Renderiza com dados
      → Envia via Z-API
      → Cria log
```

### 4. Suspensão
```
WebhookEfiController.handleChargeCanceled()
  → Atualiza subscription
  → Suspende tenant (se não cortesia)
  → NotificationService.sendSuspension()
    → Busca template 'suspension'
    → Renderiza com link de pagamento
    → Envia via Z-API
    → Cria log
```

## 🎨 Interface do Dashboard

### Seção: Notificações (Histórico)

**Componentes:**
- Cards de estatísticas (Enviadas, Pendentes, Falhadas)
- Filtros (Tipo, Status, Canal)
- Tabela com histórico
- Botões de ação (Reenviar, Deletar)
- Botão "Enviar Mensagem Manual"

**Funções JavaScript:**
```javascript
loadNotificationHistory()        // Carrega histórico com filtros
showSendManualNotification()    // Modal de envio manual
resendNotification(id)          // Reenvia notificação
deleteNotification(id)          // Remove do histórico
```

### Seção: Configurações > Mensagens

**Componentes:**
- Tab "Mensagens" dentro de Configurações
- 4 editores de template (welcome, reminder, confirmed, suspension)
- Cada editor tem:
  - Campo Assunto (email)
  - Textarea WhatsApp
  - Textarea Email
  - Toggle Ativo/Inativo
  - Lista de variáveis disponíveis
  - Botão Salvar

**Funções JavaScript:**
```javascript
loadTemplates()                 // Carrega templates do backend
saveTemplate(type)              // Salva template editado
switchSettingsTab(tab)          // Navegação entre abas
```

## 🧪 Testes

### Testar Envio Manual
```bash
curl -X POST http://localhost:3333/admin/notifications/send-manual \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "63dd998b885eb427c8c51958",
    "channel": "whatsapp",
    "recipient": "5511999999999",
    "recipient_name": "Teste",
    "message": "Mensagem de teste"
  }'
```

### Testar Job de Lembretes
```javascript
// Adicionar rota temporária
routes.get('/admin/jobs/reminder/run', async (req, res) => {
  await ReminderJob.runNow();
  res.json({ success: true });
});
```

### Testar Template Rendering
```bash
curl -X POST http://localhost:3333/admin/message-templates/welcome/render \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Updata Telecom"
  }'
```

## 📈 Melhorias Futuras

### Curto Prazo
- [ ] Implementar envio de email (SMTP)
- [ ] Adicionar preview de template no dashboard
- [ ] Botão "Enviar Teste" para cada template
- [ ] Exportar histórico para CSV
- [ ] Gráficos de taxa de envio

### Médio Prazo
- [ ] Templates com HTML rico (WYSIWYG editor)
- [ ] Múltiplos templates por tipo
- [ ] Agendamento manual de envios
- [ ] Webhooks de status de entrega Z-API
- [ ] Blacklist de números

### Longo Prazo
- [ ] A/B testing de templates
- [ ] Segmentação de envios
- [ ] SMS como canal alternativo
- [ ] Push notifications
- [ ] Analytics avançado

## 🐛 Troubleshooting

### Mensagens não estão sendo enviadas

1. **Verificar credenciais Z-API**
```bash
curl -X POST ${ZAPI_URL}/send-text \
  -H "Client-Token: ${ZAPI_CLIENT_TOKEN}" \
  -d '{"phone": "5511999999999", "message": "teste"}'
```

2. **Verificar logs do job**
```bash
pm2 logs mk-auth-api | grep "Job de lembretes"
```

3. **Verificar status do template**
```javascript
db.messagetemplates.find({ enabled: true })
```

4. **Verificar tenant**
```javascript
db.tenants.findOne({ _id: ObjectId("...") }, {
  notificacoes: 1,
  cortesia: 1,
  telefone: 1
})
```

### Job não está executando

1. **Verificar se iniciou**
```bash
pm2 logs mk-auth-api --lines 100 | grep "Job agendado"
```

2. **Executar manualmente**
```javascript
// Adicionar rota temporária no routes.js
routes.get('/admin/test/reminder', async (req, res) => {
  const ReminderJob = require('./app/jobs/ReminderJob').default;
  await ReminderJob.runNow();
  res.json({ success: true });
});
```

3. **Verificar cron syntax**
```javascript
// Testar a cada minuto (debug)
cron.schedule('* * * * *', async () => {
  console.log('Cron executando...');
});
```

## 🔒 Segurança

### Autenticação
- Todas as rotas de admin requerem token JWT
- Middleware `adminAuthMiddleware` valida permissões

### Dados Sensíveis
- Números de telefone logados
- Mensagens armazenadas no histórico
- Considerar LGPD para retenção de logs

### Rate Limiting
- Implementar rate limit em envios manuais
- Limitar quantidade de mensagens por dia/tenant

## 📞 Suporte

Para dúvidas ou problemas:
- Verificar logs: `pm2 logs mk-auth-api`
- Consultar histórico: Dashboard > Notificações
- Testar integração: Dashboard > Configurações > Integrações
