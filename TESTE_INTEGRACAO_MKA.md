# 🧪 TESTE DE INTEGRAÇÃO MK-AUTH API

**Data:** 27 de Novembro de 2025

---

## ✅ O QUE FOI IMPLEMENTADO

### 1️⃣ **Helper MkAuthAPI** (`src/app/helpers/MkAuthAPI.js`)
- Autenticação automática com refresh de token
- Métodos para clientes, suporte, faturas, usuários
- Timeout e retry automático
- Logs detalhados

### 2️⃣ **Feature Flag** (`use_mka_api`)
- Adicionado ao schema Tenant
- **Desativado por padrão** (segurança)
- Toggle via script `toggle_mka_api.js`

### 3️⃣ **SearchController Híbrido**
- ✅ **Modo Database** (padrão) - Acesso direto ao banco
- ✅ **Modo API MK-AUTH** - Via API oficial
- ✅ **Fallback automático** - Se API falhar, usa banco
- ✅ **Indicador de fonte** - Response inclui `source: "database"` ou `source: "mk-auth-api"`

---

## 🚀 COMO TESTAR

### **Passo 1: Testar com API DESATIVADA (modo atual)**

```bash
# API está desativada por padrão
# Fazer uma busca normal, deve usar banco de dados

curl -X GET "http://172.31.255.3:3336/search?term=silva&searchmode=enable&filterBy=1" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "tenant_id: 63dd998b885eb427c8c51958"

# Resposta deve incluir: "source": "database"
```

### **Passo 2: ATIVAR a API MK-AUTH**

```bash
cd /srv/mk-auth-support-app-backend
node toggle_mka_api.js enable

# Output esperado:
# ✅ API MK-AUTH ATIVADA
#    Tenant: Updata Telecom
#    Status: use_mka_api = true
# ⚠️  IMPORTANTE: Reinicie o servidor com "pm2 restart server"

# Reiniciar servidor
pm2 restart server
```

### **Passo 3: Testar com API ATIVADA**

```bash
# Mesma requisição, agora deve usar API MK-AUTH
curl -X GET "http://172.31.255.3:3336/search?term=silva&searchmode=enable&filterBy=1" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "tenant_id: 63dd998b885eb427c8c51958"

# Resposta deve incluir: "source": "mk-auth-api"
```

**Verificar logs:**
```bash
pm2 logs server --lines 50
```

Logs esperados:
```
🔍 Busca: termo="silva", modo="enable", filtro="1"
🚩 Feature Flag: use_mka_api = true
🌐 Usando API MK-AUTH para busca de clientes
🔐 Autenticando na API MK-AUTH: https://provedor.updata.com.br
✅ Autenticação MK-AUTH bem-sucedida
📡 MK-AUTH GET https://provedor.updata.com.br/api/cliente
✅ MK-AUTH GET /cliente - Status: 200
✅ API MK-AUTH retornou X clientes
```

### **Passo 4: DESATIVAR se necessário**

```bash
node toggle_mka_api.js disable
pm2 restart server

# Volta para modo database
```

---

## 🔄 COMO REVERTER

### **Opção 1: Desativar Feature Flag (RECOMENDADO)**

```bash
node toggle_mka_api.js disable
pm2 restart server
```
✅ Volta a usar banco de dados sem remover código

### **Opção 2: Reverter via Git**

```bash
git status
git diff src/app/controllers/SearchController.js

# Restaurar arquivo específico
git checkout HEAD -- src/app/controllers/SearchController.js

# Ou reverter último commit
git reset --soft HEAD~1

# Recompilar
npm run build
pm2 restart server
```

---

## 📊 COMPARAÇÃO

| Aspecto | Database (Atual) | API MK-AUTH |
|---------|------------------|-------------|
| **Latência** | ~50ms | ~200-500ms |
| **Sincronização** | Imediata | Depende da API |
| **Dados** | Sempre atualizado | Atualizado via API |
| **Confiabilidade** | 100% (local) | Depende da API |
| **Manutenção** | Total | Suporte oficial |
| **Fallback** | N/A | Automático para DB |

---

## ⚠️ PONTOS DE ATENÇÃO

1. **URL da API** está configurada em `webhook_mka_servidor`
   - Atual: `https://provedor.updata.com.br`
   - Verificar se é a URL correta da API MK-AUTH

2. **Autenticação** usa endpoint `/api/auth/cliente`
   - Confirmar se é o endpoint correto

3. **Estrutura de resposta** pode variar
   - Código normaliza para formato esperado
   - Testar com dados reais

4. **Status Online/Offline** ainda usa banco local
   - API não tem informação em tempo real de conexões
   - Tabela `radacct` permanece local

---

## 🎯 PRÓXIMOS ENDPOINTS PARA MIGRAR

Se o teste funcionar:

1. ✅ **SearchController** (busca clientes) - IMPLEMENTADO
2. ⏭️  **ClientController.show** (dados do cliente)
3. ⏭️  **RequestController** (chamados de suporte)
4. ⏭️  **InvoiceController** (faturas)
5. ⏭️  **EmployeeController** (técnicos)

---

## 📝 COMANDOS ÚTEIS

```bash
# Ver status atual da feature flag
node -e "const m=require('mongoose');m.connect('mongodb://root:Falcon2931@localhost:27017/mkedgetenants?authSource=admin',{useNewUrlParser:true,useUnifiedTopology:true}).then(()=>m.connection.db.collection('tenants').findOne({_id:m.Types.ObjectId('63dd998b885eb427c8c51958')})).then(t=>{console.log('use_mka_api:',t.use_mka_api);process.exit()})"

# Ativar
node toggle_mka_api.js enable && pm2 restart server

# Desativar
node toggle_mka_api.js disable && pm2 restart server

# Ver logs em tempo real
pm2 logs server

# Ver últimos erros
pm2 logs server --err --lines 100
```

---

**Status:** ✅ Pronto para teste
**Risco:** 🟢 BAIXO (feature flag + fallback automático)
**Reversível:** ✅ SIM (1 comando)
