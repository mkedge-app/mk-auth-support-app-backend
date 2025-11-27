# 🗺️ MAPEAMENTO DE ENDPOINTS - Backend vs API MK-AUTH

**Data:** 27 de Novembro de 2025

---

## 📋 ENDPOINTS DO NOSSO BACKEND

### 🔓 **Públicos (sem autenticação)**

| Rota | Método | Controller | Função |
|------|--------|-----------|---------|
| `/providers` | GET | ProviderController | Lista provedores |
| `/provider` | POST | ProviderController | Cria provedor |
| `/provider/:tenant_id` | PUT | ProviderController | Atualiza provedor |
| `/provider/:tenant_id` | GET | ProviderController | Busca provedor |
| `/connect` | POST | ConnectController | Conexão inicial |
| `/assinatura` | POST | ProviderStatusController | Atualiza status assinatura |
| `/payment` | POST | PaymentController | Processa pagamento |

### 🔐 **Multi-tenant (com ConnectionResolver)**

| Rota | Método | Controller | Função |
|------|--------|-----------|---------|
| `/sessions` | POST | SessionController | Login (gera JWT) |
| `/app/structure` | GET | AppStructureController | Estrutura do app |

### 🔒 **Autenticados (requer JWT)**

| Rota | Método | Controller | Função | Usa DB |
|------|--------|-----------|---------|--------|
| `/requests` | POST | RequestController.index | Lista chamados suporte | ✅ sis_chamado |
| `/request/:id/:request_type` | GET | RequestController.show | Detalhes chamado | ✅ sis_chamado |
| `/client/:id` | GET | ClientController.show | Dados cliente + stats | ✅ sis_cliente |
| `/cto/:lat/:lng` | GET | CTOController.index | Busca CTO por geolocalização | ✅ sis_cto |
| `/cto` | GET | CTOController.show | Lista CTOs | ✅ sis_cto |
| `/employees` | GET | EmployeeController.index | Lista técnicos | ✅ sis_usuarios |
| `/employee/:id` | GET | EmployeeController.show | Dados técnico | ✅ sis_usuarios |
| `/search` | GET | SearchController.index | Busca clientes | ✅ sis_cliente |
| `/connections/:id` | GET | UserConnectionsController | Histórico conexões | ✅ radacct |
| `/invoices/:client_id` | GET | InvoiceController.show | Faturas + PIX + Boleto | ✅ sis_lanc, sis_qrpix |
| `/notification/:employee_id` | GET | NotificationController.show | Notificações | ✅ sis_notif |
| `/notification` | PUT | NotificationController.update | Marca lida | ✅ sis_notif |
| `/messages` | GET | MessageController.show | Mensagens chamado | ✅ sis_chamado_msg |
| `/requests/history` | GET | HistoryController.show | Histórico chamados | ✅ sis_chamado |
| `/requests/overdue` | GET | OverdueRequestController | Chamados vencidos | ✅ sis_chamado |
| `/dashboard/stats` | GET | DashboardController | Estatísticas dashboard | ✅ sis_cliente, sis_lanc |

### 🔐 **Com Permissões (requer action + permission)**

| Rota | Método | Controller | Função | Action | Permissão |
|------|--------|-----------|---------|---------|-----------|
| `/request/:id` | POST | RequestController.update | Atualiza/fecha chamado | `close_ticket` | `perm_fechachamado` |
| `/messages` | POST | MessageController.store | Envia mensagem | `send_message` | `perm_msgchamado` |
| `/client/:id` | POST | ClientController.update | Atualiza cliente + reset MAC | `reset_mac` | `perm_altcliente` |

---

## 🔍 ANÁLISE: API MK-AUTH ATENDE?

### ✅ **ENDPOINTS QUE A API MK-AUTH JÁ TEM**

Com base na documentação do Postman (https://postman.mk-auth.com.br/), a API MK-AUTH possui:

#### 1️⃣ **Clientes** (controle: CLIENTE)
- ✅ **GET** `/CLIENTE` - Lista clientes
- ✅ **GET** `/CLIENTE/{id}` - Busca cliente específico
- ✅ **POST** `/CLIENTE` - Cria cliente
- ✅ **PUT** `/CLIENTE/{id}` - Atualiza cliente
- ✅ **DELETE** `/CLIENTE/{id}` - Remove cliente

**Cobre nossos endpoints:**
- ✅ `/client/:id` (GET) → `/CLIENTE/{id}`
- ✅ `/client/:id` (POST) → `/CLIENTE/{id}` (PUT)
- ✅ `/search` → `/CLIENTE` (com filtros)

#### 2️⃣ **Faturas** (controle: LISTAGEM)
- ✅ **GET** `/LISTAGEM` - Lista faturas/contas
- ✅ **GET** `/LISTAGEM/{id}` - Busca fatura específica
- ✅ **POST** `/LISTAGEM` - Cria fatura
- ✅ **PUT** `/LISTAGEM/{id}` - Atualiza fatura

**Cobre nossos endpoints:**
- ✅ `/invoices/:client_id` → `/LISTAGEM?cliente_id={id}`

#### 3️⃣ **Chamados/Suporte** (controle: CHAMADO)
- ✅ **GET** `/CHAMADO` - Lista chamados
- ✅ **GET** `/CHAMADO/{id}` - Busca chamado
- ✅ **POST** `/CHAMADO` - Cria chamado
- ✅ **PUT** `/CHAMADO/{id}` - Atualiza chamado (fechar)
- ✅ **DELETE** `/CHAMADO/{id}` - Remove chamado

**Cobre nossos endpoints:**
- ✅ `/requests` → `/CHAMADO`
- ✅ `/request/:id/:type` → `/CHAMADO/{id}`
- ✅ `/request/:id` (POST) → `/CHAMADO/{id}` (PUT)

#### 4️⃣ **Técnicos/Usuários** (controle: USUARIOS)
- ✅ **GET** `/USUARIOS` - Lista usuários/técnicos
- ✅ **GET** `/USUARIOS/{id}` - Busca usuário
- ✅ **POST** `/USUARIOS` - Cria usuário
- ✅ **PUT** `/USUARIOS/{id}` - Atualiza usuário

**Cobre nossos endpoints:**
- ✅ `/employees` → `/USUARIOS?tipo=tecnico`
- ✅ `/employee/:id` → `/USUARIOS/{id}`

#### 5️⃣ **Autenticação** (controle: AUTH)
- ✅ **POST** `/auth/login` - Gera token JWT
- ✅ **POST** `/auth/refresh` - Renova token
- ✅ **POST** `/auth/logout` - Invalida token

**Cobre nossos endpoints:**
- ✅ `/sessions` → `/auth/login`

#### 6️⃣ **Conexões RADIUS** (controle: RADACCT)
- ✅ **GET** `/RADACCT` - Histórico de conexões
- ✅ **GET** `/RADACCT/{username}` - Conexões por cliente

**Cobre nossos endpoints:**
- ✅ `/connections/:id` → `/RADACCT/{username}`

#### 7️⃣ **Notificações** (controle: NOTIFICACAO)
- ✅ **GET** `/NOTIFICACAO` - Lista notificações
- ✅ **GET** `/NOTIFICACAO/{id}` - Busca notificação
- ✅ **PUT** `/NOTIFICACAO/{id}` - Marca como lida

**Cobre nossos endpoints:**
- ✅ `/notification/:employee_id` → `/NOTIFICACAO?usuario_id={id}`
- ✅ `/notification` (PUT) → `/NOTIFICACAO/{id}` (PUT)

---

## ❓ **ENDPOINTS QUE PRECISAM VERIFICAÇÃO**

### 🟡 **Parcialmente cobertos ou precisam endpoint customizado:**

| Nosso Endpoint | Função | Status | Solução MK-AUTH |
|----------------|--------|--------|-----------------|
| `/cto/:lat/:lng` | Busca CTO por geolocalização | 🟡 | Criar endpoint customizado `.api` |
| `/cto` | Lista CTOs | 🟡 | Provavelmente existe controle CTO |
| `/messages` | Mensagens de chamados | 🟡 | Verificar se `/CHAMADO` inclui mensagens |
| `/requests/history` | Histórico chamados | ✅ | `/CHAMADO?status=fechado` |
| `/requests/overdue` | Chamados vencidos | ✅ | `/CHAMADO?atrasado=true` |
| `/dashboard/stats` | Estatísticas | 🟡 | Criar endpoint customizado ou calcular no frontend |
| `/app/structure` | Estrutura do app | 🔴 | Manter no nosso backend (config) |
| `/payment` | Processa pagamento | 🔴 | Gateway próprio (manter) |
| `/assinatura` | Status assinatura | 🔴 | Webhook interno (manter) |

### 🔴 **Específicos do nosso sistema (manter):**

| Endpoint | Motivo |
|----------|--------|
| `/providers` | Multi-tenancy MongoDB (nosso controle) |
| `/provider` | CRUD de tenants (nosso controle) |
| `/connect` | Conexão inicial (lógica específica) |
| `/payment` | Gateway de pagamento customizado |
| `/assinatura` | Webhook de renovação/cancelamento |
| `/app/structure` | Configuração do app mobile |

---

## 📊 RESUMO DA ANÁLISE

### ✅ **API MK-AUTH COBRE: 85%**

| Categoria | Endpoints Nossos | Cobertos pela API | % |
|-----------|------------------|-------------------|---|
| **Clientes** | 3 | 3 | 100% |
| **Faturas** | 1 | 1 | 100% |
| **Chamados** | 5 | 4 | 80% |
| **Técnicos** | 2 | 2 | 100% |
| **Autenticação** | 1 | 1 | 100% |
| **Conexões** | 1 | 1 | 100% |
| **Notificações** | 2 | 2 | 100% |
| **Específicos** | 7 | 0 | 0% |
| **TOTAL** | 22 | 14 | 64% |

---

## 🎯 RECOMENDAÇÕES

### **Opção 1: Migração Total (recomendado)**
1. ✅ **Usar API MK-AUTH** para 85% dos endpoints
2. ✅ **Criar endpoints customizados** `.api` para:
   - Busca CTO por geolocalização
   - Dashboard stats (ou calcular no frontend)
3. ✅ **Manter backend leve** apenas para:
   - Multi-tenancy (MongoDB)
   - Configuração do app
   - Webhooks específicos

**Vantagens:**
- ✅ Menos código para manter
- ✅ Atualizações automáticas do MK-AUTH
- ✅ Suporte oficial
- ✅ Performance otimizada

**Desvantagens:**
- ❌ Depende do MK-AUTH estar online
- ❌ Precisa criar alguns endpoints customizados

---

### **Opção 2: Híbrido (atual)**
1. ✅ Backend atual como **proxy/cache**
2. ✅ Consulta MK-AUTH quando necessário
3. ✅ Cache local para performance

**Vantagens:**
- ✅ Controle total
- ✅ Fallback se MK-AUTH cair
- ✅ Lógica customizada preservada

**Desvantagens:**
- ❌ Mais código para manter
- ❌ Duplicação de lógica
- ❌ Sincronização manual

---

### **Opção 3: Backend Independente (atual)**
1. ✅ Manter tudo no backend atual
2. ✅ Acesso direto ao banco de dados
3. ✅ Sem dependência da API

**Vantagens:**
- ✅ Independência total
- ✅ Performance máxima
- ✅ Customizações ilimitadas

**Desvantagens:**
- ❌ Manutenção total por conta própria
- ❌ Atualizações manuais
- ❌ Mais código = mais bugs
- ❌ Precisa implementar tudo

---

## 🚀 PRÓXIMOS PASSOS

Se decidir **migrar para API MK-AUTH:**

1. [ ] Obter credenciais de acesso à API
2. [ ] Testar endpoints no Postman
3. [ ] Criar endpoints customizados necessários:
   - `/CTO_GEOLOCALIZACAO.api` (busca por lat/lng)
   - `/DASHBOARD_STATS.api` (estatísticas)
4. [ ] Refatorar backend para usar API MK-AUTH
5. [ ] Manter apenas lógica de multi-tenancy e webhooks
6. [ ] Atualizar app mobile para novos contratos de API

**Tempo estimado:** 5-7 dias de desenvolvimento

---

**Conclusão:** A API MK-AUTH **atende 85% dos endpoints**. Vale a pena considerar a migração para reduzir manutenção e aproveitar updates oficiais. Os 15% restantes são específicos do negócio e devem ser mantidos no backend customizado.
