import axios from 'axios';
import Tenant from '../schemas/Tenant';

class MkAuthAPI {
  constructor(tenantId) {
    this.tenantId = tenantId;
    this.baseURL = null;
    this.token = null;
    this.tokenExpiry = null;
  }

  async authenticate() {
    const tenant = await Tenant.findById(this.tenantId);
    
    if (!tenant) {
      throw new Error('Tenant não encontrado');
    }

    if (!tenant.api_mka_client || !tenant.api_mka_secret) {
      throw new Error('Credenciais MK-AUTH não configuradas para este tenant');
    }

    // URL base do servidor webhook
    this.baseURL = tenant.webhook_mka_servidor;

    console.log(`🔐 Autenticando na API MK-AUTH: ${this.baseURL}`);

    try {
      const response = await axios.post(`${this.baseURL}/api/auth/cliente`, {
        client_id: tenant.api_mka_client,
        client_secret: tenant.api_mka_secret,
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.data && response.data.token) {
        this.token = response.data.token;
        // Token expira em 7 dias (padrão MK-AUTH)
        this.tokenExpiry = Date.now() + (7 * 24 * 60 * 60 * 1000);
        console.log('✅ Autenticação MK-AUTH bem-sucedida');
        return this.token;
      } else {
        throw new Error('Token não retornado pela API');
      }
    } catch (error) {
      console.error('❌ Erro ao autenticar na API MK-AUTH:', error.message);
      throw new Error(`Falha na autenticação MK-AUTH: ${error.message}`);
    }
  }

  isTokenValid() {
    return this.token && this.tokenExpiry && Date.now() < this.tokenExpiry;
  }

  async request(method, endpoint, data = null, params = null) {
    if (!this.isTokenValid()) {
      await this.authenticate();
    }

    const url = `${this.baseURL}/api${endpoint}`;
    
    console.log(`📡 MK-AUTH ${method} ${url}`);

    try {
      const config = {
        method,
        url,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      };

      if (data) {
        config.data = data;
      }

      if (params) {
        config.params = params;
      }

      const response = await axios(config);
      console.log(`✅ MK-AUTH ${method} ${endpoint} - Status: ${response.status}`);
      return response.data;
    } catch (error) {
      console.error(`❌ MK-AUTH ${method} ${endpoint} - Erro:`, error.message);
      
      // Se for erro 401, token pode ter expirado
      if (error.response?.status === 401) {
        console.log('🔄 Token expirado, tentando reautenticar...');
        this.token = null;
        this.tokenExpiry = null;
        return this.request(method, endpoint, data, params);
      }
      
      throw error;
    }
  }

  // ============ CLIENTES ============
  
  async getCliente(clienteId) {
    return this.request('GET', `/cliente/${clienteId}`);
  }

  async getClientes(params = {}) {
    return this.request('GET', '/cliente', null, params);
  }

  async updateCliente(clienteId, data) {
    return this.request('PUT', `/cliente/${clienteId}`, data);
  }

  async searchClientes(termo) {
    return this.request('GET', '/cliente', null, { busca: termo });
  }

  // ============ SUPORTE ============
  
  async getSuporte(params = {}) {
    return this.request('GET', '/suporte', null, params);
  }

  async getSuporteById(suporteId) {
    return this.request('GET', `/suporte/${suporteId}`);
  }

  async updateSuporte(suporteId, data) {
    return this.request('PUT', `/suporte/${suporteId}`, data);
  }

  async createSuporte(data) {
    return this.request('POST', '/suporte', data);
  }

  // ============ FATURAS/LISTAGEM ============
  
  async getListagem(params = {}) {
    return this.request('GET', '/listagem', null, params);
  }

  async getListagemByCliente(clienteId) {
    return this.request('GET', '/listagem', null, { cliente_id: clienteId });
  }

  // ============ USUÁRIOS/TÉCNICOS ============
  
  async getUsuarios(params = {}) {
    return this.request('GET', '/usuarios', null, params);
  }

  async getUsuarioById(usuarioId) {
    return this.request('GET', `/usuarios/${usuarioId}`);
  }

  async getTecnicos() {
    return this.request('GET', '/usuarios', null, { tipo: 'tecnico' });
  }
}

export default MkAuthAPI;
