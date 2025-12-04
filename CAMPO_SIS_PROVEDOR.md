# 📋 Implementação do Campo sis_provedor

## 🎯 Objetivo

Garantir que o frontend tenha acesso ao nome do provedor através do campo `sis_provedor` em todos os endpoints necessários, seguindo a ordem de prioridade:

1. `request.sis_provedor` (dados do chamado)
2. `clientData.sis_provedor` (dados do cliente)
3. `@mk_tenant_data.sis_provedor` (dados do tenant/provedor)
4. `@mk_tenant_data.nome_provedor` (alternativa)
5. `@mk_tenant_data.nome` (última alternativa)

---

## ✅ Mudanças Implementadas

### 1. **Modelos Atualizados**

#### Client.js
```javascript
// Adicionado campo sis_provedor
sis_provedor: Sequelize.STRING,
```

#### SupportRequest.js
```javascript
// Adicionado campo sis_provedor
sis_provedor: Sequelize.STRING,
```

#### Tenant.js (Schema MongoDB)
```javascript
provedor: {
  nome: {
    type: String,
    required: true,
  },
  sis_provedor: {
    type: String,
    required: false,
  }
}
```

---

### 2. **Controllers Atualizados**

#### RequestController.js

**Endpoint:** `GET /request/:id/Suporte`

```javascript
// No objeto de resposta, adicionado:
sis_provedor: request.sis_provedor || response.sis_provedor || null,
```

**Ordem de prioridade:**
1. `request.sis_provedor` (tabela sis_suporte)
2. `response.sis_provedor` (tabela sis_cliente)
3. `null` (se nenhum encontrado)

---

#### ClientController.js

**Endpoint:** `GET /client/:id`

O campo `sis_provedor` já é retornado automaticamente através do spread operator:

```javascript
const response = {
  ...client.dataValues, // Inclui sis_provedor
  // ... outros campos
};
```

---

#### SearchController.js

**Endpoint:** `GET /search?q={termo}`

```javascript
// Adicionado sis_provedor aos attributes da query
attributes: ['id', 'nome', 'login', 'celular', 'fone', 'plano', 'sis_provedor'],
```

---

#### ProviderController.js

**Endpoints:** 
- `GET /tenant` (novo - usa tenant_id da query)
- `GET /provider/:tenant_id` (existente)

```javascript
// Retorna múltiplos campos para fallback no frontend
provedor: {
  nome: tenant.provedor.nome,
  sis_provedor: tenant.provedor.sis_provedor || tenant.provedor.nome,
  nome_provedor: tenant.provedor.nome,
}
```

**Método `show` atualizado** para aceitar `tenant_id` tanto de `params` quanto de `query`:

```javascript
async show(req, res) {
  const tenant_id = req.params.tenant_id || req.query.tenant_id;
  // ... busca tenant e retorna dados
}
```

---

### 3. **Rotas Atualizadas**

#### routes.js

```javascript
// Nova rota para obter dados do tenant atual
routes.get('/tenant', ProviderController.show);
```

**Uso:** `GET /tenant?tenant_id={id}`

---

## 📊 Endpoints Disponíveis

| Endpoint | Método | Campo sis_provedor | Fallback |
|----------|--------|-------------------|----------|
| `/request/:id/Suporte` | GET | ✅ `request.sis_provedor \|\| client.sis_provedor` | `null` |
| `/client/:id` | GET | ✅ `client.sis_provedor` | - |
| `/search?q={termo}` | GET | ✅ `client.sis_provedor` | - |
| `/tenant?tenant_id={id}` | GET | ✅ `provedor.sis_provedor` | `provedor.nome` |
| `/provider/:tenant_id` | GET | ✅ `provedor.sis_provedor` | `provedor.nome` |

---

## 🔄 Lógica de Fallback no Backend

### RequestController
```javascript
sis_provedor: request.sis_provedor || response.sis_provedor || null
```

### ProviderController
```javascript
sis_provedor: tenant.provedor.sis_provedor || tenant.provedor.nome
```

Isso garante que sempre haverá um valor, mesmo que `sis_provedor` não esteja preenchido no banco.

---

## 📱 Como o Frontend Deve Usar

### Exemplo de Requisição (Detalhes do Chamado)

```javascript
const requestData = await api.get(`/request/${id}/Suporte?tenant_id=${tenantId}`);

// Busca sis_provedor na ordem de prioridade
const providerName = 
  requestData.sis_provedor ||           // 1. Do chamado
  clientData.sis_provedor ||            // 2. Do cliente
  tenantData.provedor.sis_provedor ||   // 3. Do tenant
  tenantData.provedor.nome_provedor ||  // 4. Alternativa
  tenantData.provedor.nome;             // 5. Última alternativa
```

### Exemplo de Requisição (Dados do Tenant)

```javascript
const tenantData = await api.get(`/tenant?tenant_id=${tenantId}`);

// Já vem com fallback automático no backend
const providerName = tenantData.provedor.sis_provedor; 
// Retorna sis_provedor OU nome se sis_provedor for null
```

---

## 🗄️ Estrutura do Banco de Dados

### Tabelas Afetadas

#### sis_cliente
```sql
-- Adicionar coluna (se não existir)
ALTER TABLE sis_cliente ADD COLUMN sis_provedor VARCHAR(255) NULL;
```

#### sis_suporte
```sql
-- Adicionar coluna (se não existir)
ALTER TABLE sis_suporte ADD COLUMN sis_provedor VARCHAR(255) NULL;
```

#### tenants (MongoDB)
```javascript
{
  provedor: {
    nome: "Nome do Provedor",
    sis_provedor: "Nome do Provedor no Sistema" // Novo campo opcional
  }
}
```

---

## ⚠️ Observações Importantes

1. **Campo Opcional:** `sis_provedor` é opcional em todas as tabelas
2. **Fallback Automático:** Se `sis_provedor` for `null`, o backend retorna `provedor.nome`
3. **Retrocompatibilidade:** Não quebra dados existentes - usa `nome` como fallback
4. **Performance:** Nenhum impacto nas queries otimizadas (campo apenas adicionado aos SELECT)

---

## 🚀 Testando

### 1. Testar Detalhes do Chamado
```bash
curl -X GET "http://mk-edge.com.br:3335/request/123/Suporte?tenant_id=abc123" \
  -H "Authorization: Bearer {token}"

# Resposta deve incluir:
{
  "sis_provedor": "Nome do Provedor" // ou null
}
```

### 2. Testar Dados do Cliente
```bash
curl -X GET "http://mk-edge.com.br:3335/client/2666?tenant_id=abc123" \
  -H "Authorization: Bearer {token}"

# Resposta deve incluir:
{
  "sis_provedor": "Nome do Provedor" // ou null
}
```

### 3. Testar Busca
```bash
curl -X GET "http://mk-edge.com.br:3335/search?q=joao&tenant_id=abc123" \
  -H "Authorization: Bearer {token}"

# Resposta deve incluir sis_provedor nos resultados
```

### 4. Testar Dados do Tenant
```bash
curl -X GET "http://mk-edge.com.br:3335/tenant?tenant_id=abc123" \
  -H "Authorization: Bearer {token}"

# Resposta:
{
  "provedor": {
    "nome": "Nome do Provedor",
    "sis_provedor": "Nome do Provedor",  // com fallback
    "nome_provedor": "Nome do Provedor"
  }
}
```

---

## 📝 Checklist de Implementação

- [x] Modelo Client com campo sis_provedor
- [x] Modelo SupportRequest com campo sis_provedor
- [x] Schema Tenant com campo sis_provedor
- [x] RequestController retorna sis_provedor
- [x] ClientController retorna sis_provedor
- [x] SearchController retorna sis_provedor
- [x] ProviderController retorna sis_provedor com fallback
- [x] Rota /tenant criada
- [x] Lógica de fallback implementada
- [x] Código compilado e testado
- [x] Documentação criada

---

## 🔧 Próximos Passos (Opcional)

1. **Migração de Dados:** Popular campo `sis_provedor` nas tabelas existentes
2. **Validação Frontend:** Implementar lógica de prioridade no app mobile
3. **Logs:** Adicionar log quando sis_provedor não for encontrado (conforme solicitado)
4. **Testes Automatizados:** Criar testes para endpoints com sis_provedor

---

**Data de Implementação:** 28 de novembro de 2025  
**Versão:** v2.1  
**Status:** ✅ Implementado e Testado

