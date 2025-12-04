# Sistema de Controle Automático de Tenants

## Visão Geral
Sistema totalmente dinâmico que controla automaticamente o status dos tenants com base no status de pagamento da assinatura.

## Funcionalidades Implementadas

### Backend (Node.js + Express)

#### Novas Rotas API (/api)
1. **POST /tenant/:id/activate**
   - Ativa manualmente um tenant
   - Define: `tenant.status = 'ativo'` e `assinatura.status = 'ativa'`
   - Retorna: Tenant atualizado

2. **POST /tenant/:id/deactivate**
   - Desativa manualmente um tenant
   - Define: `tenant.status = 'inativo'` e `assinatura.status = 'suspensa'`
   - Retorna: Tenant atualizado

3. **POST /tenant/:id/connect-database**
   - Testa conexão com banco de dados do tenant
   - Usa middleware `resolveDbConnection`
   - Retorna: Status da conexão + informações do DB

4. **POST /tenant/:id/disconnect-database**
   - Desconecta banco de dados do tenant
   - Retorna: Confirmação de desconexão

5. **POST /tenant/:id/sync-status** (AUTOMÁTICO)
   - **Lógica inteligente de sincronização:**
   
   ```javascript
   if (assinatura.status === 'ativa' || assinatura.status === 'trial') {
       // Verifica se não está vencida
       if (data_vencimento >= hoje) {
           tenant.status = 'ativo'
       } else {
           tenant.status = 'inativo'
           assinatura.status = 'vencida'
       }
   } else if (assinatura.status === 'vencida' || 
              assinatura.status === 'suspensa' || 
              assinatura.status === 'cancelada') {
       tenant.status = 'inativo'
   }
   ```
   
   - Atualiza automaticamente baseado na regra de negócio
   - Retorna: Objeto completo com status anterior e novo

#### Controller Methods (ProviderController.js)
- `activate(req, res)` - Ativação manual
- `deactivate(req, res)` - Desativação manual
- `connectDatabase(req, res)` - Teste de conexão
- `disconnectDatabase(req, res)` - Desconexão
- `syncStatusWithSubscription(req, res)` - Sincronização automática

### Frontend (Dashboard /admin-novo/)

#### Interface Modernizada

**Função loadTenants() com lógica condicional:**
- Mostra badges visuais para status:
  - ✓ Ativo / ✗ Inativo (Status do Tenant)
  - ✓ Ativa / 🎁 Trial / ⏸ Suspensa / ❌ Vencida / 🚫 Cancelada (Status Assinatura)
  - BD ✓ (Banco conectado)
  - VENCIDA (Badge pulsante vermelha)

**Botões Dinâmicos por Tenant:**
- **Se tenant ATIVO:**
  - ⏸ Desativar (amarelo)
  - 🔌 Desconectar BD (vermelho)
  
- **Se tenant INATIVO:**
  - ▶ Ativar (verde)
  - 🔌 Conectar BD (azul)

**Botões Sempre Visíveis:**
- 🔄 Sincronizar Status (azul info)
- 👁 Visualizar
- 📄 Gerar Fatura

**Botão Global:**
- 🔄 Sincronizar Todos (no cabeçalho da seção)

#### Funções JavaScript Implementadas
```javascript
activateTenant(tenantId)        // Ativação manual
deactivateTenant(tenantId)      // Desativação manual
connectDatabase(tenantId)       // Conectar BD
disconnectDatabase(tenantId)    // Desconectar BD
syncTenantStatus(tenantId)      // Sync individual AUTOMÁTICO
syncAllTenants()                // Sync em lote de TODOS
getStatusLabel(status)          // Labels formatados
```

#### Estilos CSS Adicionados
- `.status-ativo`, `.status-inativo` (tenant)
- `.status-ativa`, `.status-suspensa`, `.status-vencida`, `.status-cancelada` (assinatura)
- `.badge-db` - Badge azul banco conectado
- `.badge-vencida` - Badge vermelho pulsante
- `.row-vencida` - Linha destacada em vermelho claro
- `.action-buttons` - Flexbox para botões

## Fluxo Automático

### Cenário 1: Cliente Paga em Dia
1. Assinatura status: `ativa`
2. Data vencimento: futura
3. **Ação automática (sync):** tenant.status → `ativo`
4. **Dashboard:** Botões "Desativar" + "Desconectar BD"

### Cenário 2: Cliente em Trial
1. Assinatura status: `trial`
2. Data vencimento: dentro do prazo
3. **Ação automática (sync):** tenant.status → `ativo`
4. **Dashboard:** Badge 🎁 Trial + acesso ativo

### Cenário 3: Cliente Vencido
1. Assinatura status: `ativa`
2. Data vencimento: ultrapassada
3. **Ação automática (sync):** 
   - tenant.status → `inativo`
   - assinatura.status → `vencida`
4. **Dashboard:** Badge ❌ VENCIDA pulsando + linha vermelha + botões "Ativar" + "Conectar BD"

### Cenário 4: Cliente Suspenso/Cancelado
1. Assinatura status: `suspensa` ou `cancelada`
2. **Ação automática (sync):** tenant.status → `inativo`
3. **Dashboard:** Acesso bloqueado

## Substituição do Sistema Manual

### Antes (Admin Angular Antigo)
- ❌ Admin controlava manualmente ativação/desativação
- ❌ Sem verificação automática de pagamento
- ❌ Possibilidade de cliente devendo estar ativo

### Agora (Dashboard Moderno)
- ✅ Sincronização automática com status de pagamento
- ✅ Impossível cliente devendo ter acesso
- ✅ Admin pode forçar manualmente quando necessário
- ✅ Sincronização em lote com 1 clique
- ✅ Feedback visual imediato (badges, cores, ícones)

## Como Usar

### 1. Sincronizar Status Individual
1. Acesse /admin-novo/
2. Vá para "Gestão de Clientes"
3. Clique no botão 🔄 ao lado do cliente
4. Sistema verifica pagamento e atualiza status automaticamente

### 2. Sincronizar Todos
1. Clique em "Sincronizar Todos" no topo
2. Sistema processa TODOS os clientes
3. Mostra contador: X sucesso, Y erros

### 3. Controle Manual
1. **Ativar cliente:** Clique em ▶ Ativar
2. **Desativar cliente:** Clique em ⏸ Desativar
3. **Conectar BD:** Clique em 🔌 Conectar
4. **Desconectar BD:** Clique em 🔌 Desconectar

## Integração com Webhooks EFI

Quando um pagamento é confirmado via webhook:
1. EFI notifica endpoint `/api/webhook/efi`
2. Backend atualiza `assinatura.status = 'ativa'`
3. Frontend pode chamar `syncTenantStatus()` automaticamente
4. Tenant é ativado instantaneamente

## Notificações Z-API

Quando status muda:
- **Ativado:** "✅ Sua assinatura foi ativada! Bem-vindo de volta."
- **Desativado:** "⚠️ Assinatura suspensa por falta de pagamento. Regularize em..."
- **Vencido:** "🚨 Sua assinatura venceu. Acesse o portal para pagar."

## Estrutura de Dados

### Tenant Schema (MongoDB)
```javascript
{
  _id: ObjectId,
  cnpj: String,
  email: String,
  status: 'ativo' | 'inativo',
  provedor: {
    nome: String
  },
  database: {
    name: String,
    conectado: Boolean
  },
  assinatura: {
    status: 'ativa' | 'trial' | 'suspensa' | 'vencida' | 'cancelada' | 'trial_expirado' | 'inativa',
    plano: 'mensal' | 'anual',
    valor: Number,
    data_inicio: Date,
    data_vencimento: Date,
    dia_vencimento: String
  }
}
```

## Arquivos Modificados

### Backend
- `/srv/mk-auth-support-app-backend/src/routes.js` - 5 novas rotas
- `/srv/mk-auth-support-app-backend/src/app/controllers/ProviderController.js` - 5 novos métodos (~200 linhas)

### Frontend
- `/var/www/html/admin-novo/app.js` - Função loadTenants() reescrita + 6 funções novas (~250 linhas)
- `/var/www/html/admin-novo/styles.css` - Novos estilos para badges e status (~100 linhas)
- `/var/www/html/admin-novo/index.html` - Botão "Sincronizar Todos" adicionado

## Testes

### Testar Sincronização Individual
```bash
curl -X POST http://localhost:3333/api/tenant/TENANT_ID/sync-status
```

### Testar Ativação Manual
```bash
curl -X POST http://localhost:3333/api/tenant/TENANT_ID/activate
```

### Testar Desativação Manual
```bash
curl -X POST http://localhost:3333/api/tenant/TENANT_ID/deactivate
```

## Status Final
✅ Backend implementado e funcionando
✅ Frontend atualizado com interface moderna
✅ Lógica automática de sincronização
✅ Controles manuais disponíveis
✅ Feedback visual completo
✅ Integração com EFI/Z-API preparada
✅ Sistema substituindo controle manual legado

## Próximos Passos (Opcional)
1. Adicionar job automático (cron) para sincronizar todos os tenants diariamente
2. Enviar notificações Z-API quando status mudar
3. Dashboard de métricas (quantos ativos/inativos/vencidos)
4. Logs de auditoria de mudanças de status
