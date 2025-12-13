# Sistema de Trial Gratuito de 7 Dias

## 📋 Visão Geral

Sistema completo de teste gratuito que permite novos clientes experimentarem o sistema por 7 dias sem necessidade de pagamento antecipado.

## 🎯 Fluxo Completo

### 1. Cadastro (Dia 0)
```
Cliente preenche formulário de cadastro
  → Sistema cria conta em trial
  → WhatsApp habilitado automaticamente
  → Envia mensagem de boas-vindas
  → Status: "trial"
  → Acesso liberado por 7 dias
```

**Dados Criados:**
- Tenant com `status: 'trial'`
- Subscription com `status: 'trial'`
- Trial ends em 7 dias
- Notificações WhatsApp habilitadas

**Mensagem Enviada:**
```
Olá {{nome}}! 🎉

Bem-vindo à MK Edge! Sua conta foi criada com sucesso.

Você tem 7 dias de teste grátis para conhecer todas as funcionalidades.

Acesse: http://mk-edge.com.br/portal

Qualquer dúvida, estamos à disposição!
```

### 2. Durante o Trial (Dias 1-4)
```
Cliente utiliza sistema normalmente
  → Acesso total às funcionalidades
  → Sem cobranças
  → Sem limitações (exceto limite do plano)
```

### 3. Lembrete - 3 Dias Antes (Dia 4)
```
Job executa às 9h
  → Busca trials que expiram em 3 dias
  → Envia lembrete via WhatsApp
  → Informa que cobrança será gerada
```

**Mensagem Enviada:**
```
Olá {{nome}}! 📅

Seu período de teste grátis termina em 3 dias ({{vencimento}}).

Após esse período, será gerada uma cobrança de {{valor}} para manter seu acesso ativo.

Não se preocupe, você receberá o link de pagamento quando isso acontecer!
```

### 4. Trial Expira (Dia 7)
```
Job executa às 8h
  → Busca trials que expiraram hoje
  → Cria cobrança na EFI (charge)
  → Gera PIX e Boleto
  → Atualiza status para "pendente_pagamento"
  → Envia link de pagamento via WhatsApp
```

**Mensagem Enviada:**
```
Olá {{nome}}! 📅

Seu período de teste terminou. Para continuar usando a MK Edge, realize o pagamento de {{valor}}.

Você tem 5 dias para pagar (vencimento: {{vencimento}}).

Link de pagamento:
{{link_pagamento}}

Obrigado!
```

**Dados Atualizados:**
- Tenant: `status: 'pendente_pagamento'`
- Subscription: `status: 'pending_payment'`
- Criada cobrança EFI com charge_id
- PIX e Boleto gerados

### 5. Cliente Paga (Qualquer momento)
```
EFI envia webhook de pagamento confirmado
  → Sistema atualiza status
  → Tenant ativado automaticamente
  → Envia confirmação via WhatsApp
```

**Mensagem Enviada:**
```
Olá {{nome}}! ✅

Pagamento de {{valor}} confirmado!

Sua assinatura está ativa até {{vencimento}}.

Obrigado pela confiança!
```

**Dados Atualizados:**
- Tenant: `status: 'ativo'`
- Subscription: `status: 'active'`
- Próximo vencimento em 30 dias

### 6. Cliente Não Paga (Após vencimento)
```
Cobrança vence sem pagamento
  → Sistema marca como vencida
  → Pode enviar avisos de suspensão
  → Pode suspender acesso (configurável)
```

## 🤖 Jobs Automáticos

### ReminderJob (9h diárias)
**Função:** Enviar lembretes de pagamento e trial

**Operações:**
1. **Lembretes de Assinatura Ativa:**
   - Busca subscriptions ativas que vencem em 3 dias
   - Envia lembrete de renovação

2. **Lembretes de Trial:**
   - Busca trials que expiram em 3 dias
   - Envia aviso que cobrança será gerada

**Lógica:**
```javascript
// Ignora cortesia
if (tenant.cortesia) continue;

// Verifica WhatsApp habilitado
if (!tenant.notificacoes?.whatsapp_enabled) continue;

// Envia notificação
await NotificationService.sendNotification({...});
```

### TrialExpirationJob (8h diárias)
**Função:** Processar trials expirados e criar cobranças

**Operações:**
1. **Buscar Trials Expirados:**
   - Subscription com `status: 'trial'`
   - `trial_end` = hoje

2. **Para Cada Trial:**
   - Se `cortesia: true` → Ativa sem cobrança
   - Se normal → Cria cobrança EFI
   - Gera PIX e Boleto
   - Atualiza status para `pending_payment`
   - Envia link de pagamento

**Lógica Cortesia:**
```javascript
if (tenant.cortesia) {
  subscription.status = 'active';
  tenant.status = 'ativo';
  // Sem cobrança, apenas ativa
}
```

**Criação de Cobrança:**
```javascript
// Cria charge na EFI
const charge = await EfiSubscriptionService.createCharge({
  tenant_id,
  plano_id,
  valor,
  vencimento: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // +5 dias
});

// Gera PIX e Boleto
const [pix, boleto] = await Promise.all([
  EfiSubscriptionService.generatePix(charge_id),
  EfiSubscriptionService.generateBoleto(charge_id)
]);

// Salva dados de pagamento
subscription.payment_data = { pix, boleto };
```

## 📊 Estados do Sistema

### Status da Subscription
- `trial` - Em período de teste (7 dias)
- `pending_payment` - Aguardando pagamento
- `active` - Assinatura ativa e paga
- `canceled` - Cancelada

### Status do Tenant
- `trial` - Em teste grátis
- `pendente_pagamento` - Cobrança gerada, aguardando
- `ativo` - Pago e funcionando
- `suspenso` - Acesso bloqueado por falta de pagamento
- `cancelado` - Conta cancelada

## 🎛️ Configurações

### Duração do Trial
```javascript
// SignupController.js
const dataFimTrial = addDays(dataInicio, 7); // 7 dias
```

### Prazo de Pagamento Após Trial
```javascript
// TrialExpirationJob.js
vencimento: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 dias
```

### Horários dos Jobs
```javascript
// ReminderJob
cron.schedule('0 9 * * *', ...) // 9h da manhã

// TrialExpirationJob
cron.schedule('0 8 * * *', ...) // 8h da manhã
```

### WhatsApp Padrão
```javascript
// SignupController.js
notificacoes: {
  whatsapp_enabled: true,  // Habilitado por padrão
  email_enabled: true
}
```

## 🔧 Como Testar

### 1. Criar Conta de Teste
```bash
curl -X POST http://localhost:3333/signup \
  -H "Content-Type: application/json" \
  -d '{
    "empresa": "Empresa Teste",
    "cnpj": "12345678000199",
    "responsavel": "João Silva",
    "contato": "5511999999999",
    "email": "teste@exemplo.com",
    "senha": "senha123"
  }'
```

**Resposta Esperada:**
```json
{
  "success": true,
  "message": "Conta criada com sucesso! Você tem 7 dias de teste grátis.",
  "tenant": {
    "id": "...",
    "empresa": "Empresa Teste",
    "trial_end": "2025-12-16T...",
    "dias_restantes": 7
  }
}
```

### 2. Verificar Boas-Vindas Enviada
```bash
# Ver logs
pm2 logs mk-auth-api --lines 50 | grep "boas-vindas"

# Ou consultar histórico
curl http://localhost:3333/admin/notifications?template_type=welcome \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Testar Job de Trial Expirando
```javascript
// Modificar data do trial manualmente
db.subscriptions.updateOne(
  { tenant_id: ObjectId("...") },
  { 
    $set: { 
      trial_end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 dias
    }
  }
)

// Executar job manualmente
import ReminderJob from './app/jobs/ReminderJob';
await ReminderJob.runNow();
```

### 4. Testar Expiração de Trial
```javascript
// Modificar data do trial para hoje
db.subscriptions.updateOne(
  { tenant_id: ObjectId("...") },
  { 
    $set: { 
      trial_end: new Date() // Hoje
    }
  }
)

// Executar job manualmente
import TrialExpirationJob from './app/jobs/TrialExpirationJob';
await TrialExpirationJob.runNow();
```

### 5. Simular Pagamento
```bash
# Webhook EFI
curl -X POST http://localhost:3333/webhook/efi \
  -H "Content-Type: application/json" \
  -d '{
    "event": "charge.paid",
    "data": {
      "charge_id": "CHARGE_ID_AQUI",
      "value": 10000
    }
  }'
```

## 📋 Checklist de Validação

### ✅ Cadastro
- [ ] Conta criada com status `trial`
- [ ] Trial ends em 7 dias a partir de hoje
- [ ] WhatsApp habilitado automaticamente
- [ ] Mensagem de boas-vindas enviada
- [ ] Log criado no histórico

### ✅ Durante Trial
- [ ] Cliente consegue acessar o sistema
- [ ] Funcionalidades disponíveis
- [ ] Sem cobranças geradas

### ✅ 3 Dias Antes
- [ ] Job executa às 9h
- [ ] Lembrete enviado via WhatsApp
- [ ] Log criado no histórico
- [ ] Cortesia não recebe lembrete

### ✅ Trial Expira
- [ ] Job executa às 8h
- [ ] Cobrança criada na EFI
- [ ] PIX e Boleto gerados
- [ ] Status muda para `pending_payment`
- [ ] Link enviado via WhatsApp
- [ ] Cortesia ativa sem cobrança

### ✅ Pagamento Confirmado
- [ ] Webhook recebido da EFI
- [ ] Status muda para `active`
- [ ] Tenant ativado
- [ ] Confirmação enviada via WhatsApp
- [ ] Próximo vencimento em 30 dias

## 🐛 Troubleshooting

### Trial não está expirando
```bash
# Verificar subscriptions em trial
db.subscriptions.find({ status: 'trial' })

# Ver trial_end
db.subscriptions.find({ 
  status: 'trial',
  trial_end: { $lte: new Date() }
})

# Verificar logs do job
pm2 logs mk-auth-api | grep "Trial"
```

### Cobrança não foi criada
```bash
# Verificar credenciais EFI
echo $EFI_CLIENT_ID
echo $EFI_CLIENT_SECRET

# Testar criação manual
curl -X POST http://localhost:3333/subscription/create \
  -H "Content-Type: application/json" \
  -d '{...}'

# Ver logs de erro
pm2 logs mk-auth-api --err
```

### Mensagem não foi enviada
```bash
# Verificar Z-API
echo $ZAPI_URL
echo $ZAPI_CLIENT_TOKEN

# Ver histórico
curl http://localhost:3333/admin/notifications?status=failed

# Ver logs
pm2 logs mk-auth-api | grep "WhatsApp"
```

### Job não está executando
```bash
# Verificar se iniciou
pm2 logs mk-auth-api --lines 100 | grep "Job"

# Deve mostrar:
# 📅 Job de lembretes iniciado
# ✅ Job agendado para executar diariamente às 9h
# 📅 Job de expiração de trial iniciado
# ✅ Job agendado para executar diariamente às 8h
```

## 💡 Dicas

### Alterar Duração do Trial
```javascript
// src/app/controllers/SignupController.js
const dataFimTrial = addDays(dataInicio, 14); // Mudar para 14 dias
```

### Alterar Prazo de Pagamento
```javascript
// src/app/jobs/TrialExpirationJob.js
vencimento: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 dias
```

### Desabilitar Envio Automático
```javascript
// Comentar no SignupController
// NotificationService.sendWelcome(tenant).catch(...);
```

### Enviar Lembrete 5 Dias Antes
```javascript
// src/app/jobs/ReminderJob.js
daqui3Dias.setDate(hoje.getDate() + 5); // Mudar de 3 para 5
daqui4Dias.setDate(hoje.getDate() + 6);
```

## 📈 Métricas Importantes

### Conversão de Trial
```javascript
// Total de trials criados
db.subscriptions.countDocuments({ status: 'trial' })

// Trials que converteram (pagaram)
db.subscriptions.countDocuments({ 
  status: 'active',
  trial_end: { $exists: true }
})

// Taxa de conversão
(pagos / total) * 100
```

### Tempo Médio de Conversão
```javascript
db.subscriptions.aggregate([
  {
    $match: {
      status: 'active',
      trial_end: { $exists: true },
      paid_at: { $exists: true }
    }
  },
  {
    $project: {
      dias: {
        $divide: [
          { $subtract: ['$paid_at', '$trial_end'] },
          1000 * 60 * 60 * 24
        ]
      }
    }
  },
  {
    $group: {
      _id: null,
      media: { $avg: '$dias' }
    }
  }
])
```

### Trials Expirados Sem Pagamento
```javascript
db.subscriptions.countDocuments({
  status: 'pending_payment',
  trial_end: { $lt: new Date() }
})
```

## 🔒 Considerações de Segurança

### Validar Cadastros
- ✅ CNPJ único por tenant
- ✅ Email único por tenant
- ✅ Senha hasheada (bcrypt)
- ⚠️ Adicionar captcha no formulário
- ⚠️ Rate limit em cadastros

### Evitar Abuso
- Limitar trials por CNPJ
- Limitar trials por email
- Limitar trials por IP (futuro)
- Blacklist de números suspeitos

### Webhook Seguro
- ✅ Token de validação
- ✅ Verificar origem da requisição
- ⚠️ Adicionar signature validation (HMAC)
