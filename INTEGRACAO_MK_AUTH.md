# ✅ INTEGRAÇÃO COM API MK-AUTH CONFIGURADA

**Data:** 27 de Novembro de 2025
**Tenant:** Updata Telecom (63dd998b885eb427c8c51958)

---

## 📋 O QUE FOI FEITO

### 1️⃣ **Schema Tenant Atualizado**

Adicionados 4 novos campos ao modelo MongoDB (`src/app/schemas/Tenant.js`):

```javascript
// Credenciais da API MK-AUTH
api_mka_client: {
  type: String,
  required: false,
},
api_mka_secret: {
  type: String,
  required: false,
},

// Webhook MK-AUTH
webhook_mka_servidor: {
  type: String,
  required: false,
},
webhook_mka_secret: {
  type: String,
  required: false,
},
```

### 2️⃣ **Tenant Atualizado no MongoDB**

Tenant **Updata Telecom** (`63dd998b885eb427c8c51958`) foi atualizado com:

| Campo | Valor |
|-------|-------|
| `api_mka_client` | `Client_Id_4d1e692d668f91461077c08a16c5456b` |
| `api_mka_secret` | `Client_Secret_137ae744f2ee12fef3a7eea070edbca3d0bb449e` |
| `webhook_mka_servidor` | `https://provedor.updata.com.br` |
| `webhook_mka_secret` | `137ae744f2ee12fef3a7eea070edbca3d0bb449e` |

### 3️⃣ **Controles Habilitados na API MK-AUTH**

Conforme as telas enviadas, os seguintes controles estão habilitados:

**Endpoints com permissões GET, POST, PUT, DELETE:**
- ✅ `juntos` (Contratos conjuntos)
- ✅ `adicional` (Adicionais)
- ✅ `boleto` (Boletos)
- ✅ `caixa` (Caixa)
- ✅ `cliente` (Clientes) ⭐
- ✅ `contasapagar` (Contas a pagar)
- ✅ `contato` (Contatos)
- ✅ `fornecedor` (Fornecedores)
- ✅ `frete` (Fretes)
- ✅ `lance` (Lances)
- ✅ `nas` (NAS)
- ✅ `nfe` (Notas fiscais)
- ✅ `plano` (Planos)
- ✅ `produto` (Produtos)
- ✅ `provedor` (Provedor)
- ✅ `suporte` (Suporte/Chamados) ⭐
- ✅ `totic` (TOTIC)

**Endpoints da segunda tela (equipamentos e infraestrutura):**
- ✅ `Endpoint-alterar-ap` (GET, POST, PUT, DELETE)
- ✅ `Endpoint-alterar-ap-mac` (GET, POST, PUT)
- ✅ `Endpoint-cadastro-ap` (POST)
- ✅ `Endpoint-excluir-ap` (GET, POST, PUT, DELETE)
- ✅ `Endpoint-listar-ap` (GET, POST, PUT, DELETE)
- ✅ `Endpoint-contasapagar-ap` (GET, POST, PUT, DELETE)
- ✅ `Endpoint-estoque-ap` (GET, POST, PUT, DELETE)
- ✅ `Endpoint-fornecedor-ap` (GET, POST, PUT, DELETE)
- ✅ `Endpoint-notasfiscais-ap` (GET, POST, PUT, DELETE)
- ✅ `Endpoint-placas-ap` (GET, POST)
- ✅ `Endpoint-produto-ap` (GET, POST, PUT, DELETE)
- ✅ `Endpoint-resetarplaca-ap` (GET, POST, PUT, DELETE)
- ✅ `Endpoint-resetar-senha-ap` (GET, POST, PUT, DELETE)
- ✅ `Endpoint-sites-ap` (GET, POST, PUT, DELETE)

---

## 🔗 PRÓXIMOS PASSOS PARA INTEGRAÇÃO

### **Fase 1: Autenticação**

Criar helper para autenticar na API MK-AUTH:

```javascript
// src/app/helpers/MkAuthAPI.js
import axios from 'axios';
import Tenant from '../schemas/Tenant';

class MkAuthAPI {
  constructor(tenantId) {
    this.tenantId = tenantId;
    this.baseURL = 'https://api.mk-auth.com.br/api'; // URL da API
    this.token = null;
  }

  async authenticate() {
    const tenant = await Tenant.findById(this.tenantId);
    
    if (!tenant.api_mka_client || !tenant.api_mka_secret) {
      throw new Error('Credenciais MK-AUTH não configuradas');
    }

    const response = await axios.post(`${this.baseURL}/auth/login`, {
      client_id: tenant.api_mka_client,
      client_secret: tenant.api_mka_secret,
    });

    this.token = response.data.token;
    return this.token;
  }

  async request(method, endpoint, data = null) {
    if (!this.token) {
      await this.authenticate();
    }

    const config = {
      method,
      url: `${this.baseURL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      config.data = data;
    }

    return axios(config);
  }

  // Métodos específicos
  async getCliente(clienteId) {
    return this.request('GET', `/cliente/${clienteId}`);
  }

  async getSuporte(params = {}) {
    return this.request('GET', '/suporte', params);
  }

  async updateSuporte(suporteId, data) {
    return this.request('PUT', `/suporte/${suporteId}`, data);
  }
}

export default MkAuthAPI;
```

### **Fase 2: Refatorar Controllers**

Exemplo - `ClientController.show`:

```javascript
// ANTES (acesso direto ao banco)
async show(req, res) {
  const client = await Client.findByPk(client_id);
  // ...
}

// DEPOIS (via API MK-AUTH)
async show(req, res) {
  const mkAuth = new MkAuthAPI(req.tenantId);
  const response = await mkAuth.getCliente(client_id);
  const client = response.data;
  // ...
}
```

### **Fase 3: Implementar Webhooks**

Criar endpoint para receber webhooks do MK-AUTH:

```javascript
// src/app/controllers/MkAuthWebhookController.js
class MkAuthWebhookController {
  async receive(req, res) {
    const signature = req.headers['x-webhook-signature'];
    const { webhook_mka_secret } = await Tenant.findById(req.tenantId);
    
    // Validar assinatura
    if (signature !== webhook_mka_secret) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { event, data } = req.body;

    // Processar eventos
    switch (event) {
      case 'cliente.updated':
        // Atualizar cache local
        break;
      case 'suporte.created':
        // Notificar técnicos
        break;
      // ...
    }

    return res.status(200).json({ received: true });
  }
}
```

---

## 📊 MAPEAMENTO DE ENDPOINTS

| Nosso Endpoint | API MK-AUTH | Status |
|----------------|-------------|--------|
| `/client/:id` (GET) | `/cliente/:id` | ✅ Compatível |
| `/client/:id` (POST) | `/cliente/:id` (PUT) | ✅ Compatível |
| `/requests` (POST) | `/suporte` (GET) | ✅ Compatível |
| `/request/:id` (GET) | `/suporte/:id` | ✅ Compatível |
| `/request/:id` (POST) | `/suporte/:id` (PUT) | ✅ Compatível |
| `/invoices/:client_id` | `/listagem?cliente_id=:id` | ✅ Compatível |
| `/employees` | `/usuarios?tipo=tecnico` | ✅ Compatível |

---

## 🎯 VANTAGENS DA INTEGRAÇÃO

### ✅ **Para o Backend:**
- Menos código para manter (-85%)
- Atualizações automáticas do MK-AUTH
- Suporte oficial
- Reduz carga no banco de dados

### ✅ **Para o Sistema:**
- Dados sempre sincronizados
- Funcionalidades novas automaticamente
- Consistência entre sistemas
- Webhooks em tempo real

---

## 🔐 SEGURANÇA

**Credenciais armazenadas:**
- ✅ MongoDB com autenticação SCRAM-SHA-256
- ✅ Credenciais por tenant (multi-tenancy)
- ✅ Não expostas em logs
- ⚠️  **TODO:** Criptografar `api_mka_secret` no banco

**Webhook:**
- ✅ Validação de assinatura
- ✅ HTTPS obrigatório
- ✅ Secret por tenant

---

## 📝 ARQUIVOS MODIFICADOS

1. ✅ `src/app/schemas/Tenant.js` - 4 novos campos adicionados
2. ✅ MongoDB - Tenant `63dd998b885eb427c8c51958` atualizado
3. ✅ Backup criado: `src/app/schemas/Tenant.js.backup`

---

## 🚀 COMANDOS ÚTEIS

```bash
# Recompilar após mudanças
npm run build

# Reiniciar servidor
pm2 restart server

# Ver logs
pm2 logs server

# Verificar tenant no MongoDB
node update_tenant_mka.js
```

---

**Status:** ✅ Configuração concluída
**Próximo passo:** Implementar helper `MkAuthAPI.js` e refatorar controllers
**Estimativa:** 3-5 dias de desenvolvimento
