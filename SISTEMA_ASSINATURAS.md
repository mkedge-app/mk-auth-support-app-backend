# Sistema de Assinaturas e Planos - MK-Auth

## 📋 Visão Geral

Sistema completo de gerenciamento de assinaturas, planos e controle de acesso de tenants integrado ao MK-Auth Support App.

## 🏗️ Arquitetura

### Schemas

#### 1. **Plan** (`src/app/schemas/Plan.js`)
Planos disponíveis para contratação:
- `nome`: Nome do plano (ex: "Plano Básico", "Premium", "Vitalício")
- `slug`: Identificador único (ex: "basico", "premium", "vitalicio")
- `valor`: Preço do plano
- `limite_clientes`: Limite de clientes (null = ilimitado)
- `recorrente`: true/false (mensal ou vitalício)
- `periodo`: 'mensal', 'trimestral', 'semestral', 'anual', 'vitalicio'
- `recursos`: Array de features incluídas
- `ativo`: Se o plano está disponível para contratação
- `dias_trial`: Dias de período de teste

#### 2. **Tenant** (`src/app/schemas/Tenant.js`)
Cliente/Provedor com assinatura embarcada:
```javascript
assinatura: {
  plano_id: ObjectId,           // Referência ao plano
  status: String,               // 'trial', 'active', 'suspended', 'cancelled', 'overdue', 'vencida', 'trial_expirado'
  ativa: Boolean,               // Se está ativa ou não
  plano: String,                // Slug do plano
  plano_nome: String,           // Nome do plano
  valor: Number,                // Valor da assinatura
  limite_clientes: Number,      // Limite de clientes do plano
  recorrente: Boolean,          // Se é recorrente
  data_vencimento: Date,        // Próximo vencimento
  trial_ends_at: Date,          // Fim do trial
  // ... outros campos
}
```

#### 3. **Subscription** (`src/app/schemas/Subscription.js`)
Histórico e controle de assinaturas:
- Vincula tenant a plano
- Rastreia pagamentos
- Gerencia status e vencimentos

## 🔄 Fluxo de Ativação/Desativação

### ✅ Ativação de Tenant (`POST /admin/tenant/:id/activate`)

**Verificações realizadas:**

1. ✅ **Tem plano vinculado?**
   - Se não: `error: 'Tenant não possui plano vinculado'`
   - Ação requerida: `assign_plan`

2. ✅ **Assinatura vencida?** (apenas para recorrentes)
   - Se sim: `error: 'Assinatura vencida'`
   - Ação requerida: `renew_subscription`

3. ✅ **Trial expirado?**
   - Se sim: `error: 'Trial expirado'`
   - Ação requerida: `activate_paid_subscription`

**Se todas as verificações passarem:**
- Status do tenant → `ativo`
- Status da assinatura → `active` ou `trial` (se ainda em trial)
- `assinatura.ativa` → `true`
- Conecta banco de dados automaticamente

### ⏸️ Desativação de Tenant (`POST /admin/tenant/:id/deactivate`)

**Ações realizadas:**
- Status do tenant → `inativo`
- Status da assinatura → `suspended`
- `assinatura.ativa` → `false`
- Desconecta banco de dados automaticamente

## 🔄 Sincronização Automática

### Sincronizar Tenant Individual (`POST /admin/tenant/:id/sync-status`)

Atualiza status baseado em:
- Plano vinculado
- Data de vencimento
- Status do trial
- Status da assinatura

**Lógica de sincronização:**

```
1. Sem plano vinculado
   → status: inativo
   → assinatura.status: inativa
   
2. Em trial válido
   → status: ativo
   → assinatura.status: trial
   
3. Trial expirado
   → status: inativo
   → assinatura.status: trial_expirado
   
4. Assinatura ativa e em dia
   → status: ativo
   → assinatura.status: active
   
5. Assinatura vencida (recorrente)
   → status: inativo
   → assinatura.status: vencida
   
6. Assinatura vitalícia
   → status: ativo (permanente)
   → assinatura.status: active
   
7. Assinatura suspensa/cancelada
   → status: suspenso/inativo
   → assinatura.status: suspensa/cancelada
```

### Sincronizar Todos os Tenants (`POST /admin/tenants/sync-all`)

**Executa verificação em massa:**
- Verifica todos os tenants
- Expira trials vencidos
- Suspende assinaturas vencidas
- Retorna estatísticas:
  - Total de tenants
  - Tenants atualizados
  - Trials expirados
  - Assinaturas vencidas
  - Tenants ativos

**Usar em CRON JOB:**
```bash
# Executar todos os dias às 2h da manhã
0 2 * * * curl -X POST http://localhost:3333/api/admin/tenants/sync-all
```

## 📊 Status Possíveis

### Status do Tenant
- `ativo` - Funcionando normalmente
- `inativo` - Sem acesso
- `suspenso` - Temporariamente bloqueado
- `bloqueado` - Bloqueio permanente (manual)

### Status da Assinatura
- `trial` - Período de teste ativo
- `trial_expirado` - Trial acabou
- `active` / `ativa` - Assinatura ativa e paga
- `vencida` - Pagamento atrasado
- `suspended` / `suspensa` - Suspensa manualmente
- `cancelled` / `cancelada` - Cancelada pelo cliente

## 🎯 Planos Padrão

### 1. Plano Básico
- **Valor:** R$ 150,00/mês
- **Limite:** 1000 clientes
- **Recorrente:** Sim
- **Trial:** 7 dias

### 2. Plano Premium
- **Valor:** R$ 200,00/mês
- **Limite:** Ilimitado
- **Recorrente:** Sim
- **Trial:** 7 dias
- **Destaque:** Sim

### 3. Plano Vitalício
- **Valor:** R$ 1.800,00 (pagamento único)
- **Limite:** Ilimitado
- **Recorrente:** Não
- **Trial:** 0 dias
- **Vencimento:** 2099-12-31 (nunca expira)

## 🔌 Endpoints API

### Planos
```
GET    /api/admin/plans                    - Listar planos
GET    /api/admin/plan/:id                 - Detalhes do plano
POST   /api/admin/plan                     - Criar plano
PUT    /api/admin/plan/:id                 - Atualizar plano
DELETE /api/admin/plan/:id                 - Deletar plano
POST   /api/admin/plan/:id/toggle          - Ativar/desativar plano
POST   /api/admin/plans/seed               - Criar planos padrão
```

### Gerenciamento de Assinaturas
```
PUT  /api/admin/tenant/:tenantId/plan              - Vincular plano ao tenant
POST /api/admin/tenant/:tenantId/check-limit       - Verificar limite de clientes
POST /api/admin/plan/calculate-upgrade             - Calcular upgrade com crédito
```

### Controle de Tenant
```
POST /api/admin/tenant/:id/activate                - Ativar tenant (com verificações)
POST /api/admin/tenant/:id/deactivate              - Desativar tenant
POST /api/admin/tenant/:id/sync-status             - Sincronizar status
POST /api/admin/tenants/sync-all                   - Sincronizar todos (CRON)
POST /api/admin/tenant/:id/connect-database        - Conectar DB
POST /api/admin/tenant/:id/disconnect-database     - Desconectar DB
```

## 🎨 Interface Admin

### Painel Admin-novo (`/admin-novo/`)

**Características:**
- ✅ Mostra status real do tenant (ativo/inativo/suspenso)
- ✅ Indica se tem plano vinculado
- ✅ Mostra data de vencimento
- ✅ Badge de status da assinatura
- ✅ Botões de ação contextuais:
  - Sem plano: "Sem plano vinculado"
  - Com plano ativo: Botão "Suspender"
  - Suspenso: Botão "Reativar"

**Mensagens de erro ao ativar:**
- 📋 "É necessário vincular um plano primeiro!"
- 💳 "Assinatura vencida. Realize o pagamento para reativar."
- ⏰ "Trial expirado. Ative uma assinatura paga."

## 🚀 Como Usar

### 1. Criar planos padrão (executar uma vez)
```bash
curl -X POST http://localhost:3333/api/admin/plans/seed
```

### 2. Vincular plano a um tenant
```bash
curl -X PUT http://localhost:3333/api/admin/tenant/TENANT_ID/plan \
  -H "Content-Type: application/json" \
  -d '{"plan_id": "PLAN_ID"}'
```

### 3. Ativar tenant
```bash
curl -X POST http://localhost:3333/api/admin/tenant/TENANT_ID/activate
```

### 4. Configurar CRON para sincronização automática
```bash
# Adicionar ao crontab
crontab -e

# Adicionar linha:
0 2 * * * curl -X POST http://localhost:3333/api/admin/tenants/sync-all
```

## 📝 Exemplo de Fluxo Completo

```javascript
// 1. Cliente se cadastra
POST /api/provider
{
  "cnpj": "12345678000190",
  "responsavel": "João Silva",
  "provedor": { "nome": "Provedor XYZ" },
  // ... dados do banco
}

// 2. Admin vincula plano básico
PUT /api/admin/tenant/123abc/plan
{
  "plan_id": "plano_basico_id"
}

// 3. Cliente entra em trial de 7 dias
// - status: ativo
// - assinatura.status: trial
// - assinatura.ativa: true
// - trial_ends_at: +7 dias

// 4. Após 7 dias, CRON executa sync-all
POST /api/admin/tenants/sync-all
// - Expira trial
// - status: inativo
// - assinatura.status: trial_expirado

// 5. Cliente realiza primeiro pagamento
POST /api/admin/subscription
{
  "tenant_id": "123abc",
  "valor": 150.00
}

// 6. Admin ativa assinatura paga
POST /api/admin/tenant/123abc/activate
// - status: ativo
// - assinatura.status: active
// - data_vencimento: +30 dias

// 7. Todo mês, CRON verifica vencimentos
// Se venceu e não pagou:
// - status: inativo
// - assinatura.status: vencida
```

## 🔒 Segurança

- Todos os endpoints `/admin/*` devem ter autenticação e autorização
- Validação de ObjectId antes de operações
- Logs de todas as alterações de status
- Histórico de assinaturas no schema Subscription

## 📌 Próximos Passos

1. ✅ Integração com gateway de pagamento (PIX/Cartão)
2. ✅ Envio de notificações automáticas de vencimento
3. ✅ Dashboard de métricas de assinaturas
4. ✅ Relatórios de receita recorrente (MRR)
5. ✅ Portal do cliente para gerenciar assinatura
6. ✅ Upgrade/Downgrade de planos com crédito proporcional

---

**Atualizado em:** 04/12/2025
**Versão:** 1.0
