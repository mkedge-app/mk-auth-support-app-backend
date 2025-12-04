const API_BASE = window.location.origin;

// State
let currentView = 'dashboard';
let tenants = [];
let subscriptions = [];

// Auth check
function checkAuth() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
        window.location.href = '/admin/login.html';
        return false;
    }
    return token;
}

// Logout
function logout() {
    localStorage.removeItem('admin_token');
    window.location.href = '/admin/login.html';
}

// API Call with auth
async function apiCall(endpoint, options = {}) {
    const token = checkAuth();
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            }
        });

        if (response.status === 401) {
            logout();
            return;
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showAlert('Erro ao conectar com o servidor', 'danger');
        throw error;
    }
}

// Load Dashboard
async function loadDashboard() {
    try {
        showLoading();
        
        // Load tenants
        tenants = await apiCall('/providers');
        
        // Load subscriptions
        subscriptions = await apiCall('/subscriptions');
        
        // Calculate stats
        const stats = {
            total: tenants.length,
            active: tenants.filter(t => t.assinatura.ativa).length,
            trial: tenants.filter(t => t.assinatura.status === 'trial').length,
            suspended: tenants.filter(t => t.assinatura.status === 'suspended').length,
            revenue: tenants.filter(t => t.assinatura.ativa)
                .reduce((sum, t) => sum + t.assinatura.valor, 0)
        };
        
        renderStats(stats);
        renderTenantsTable(tenants);
        
        hideLoading();
    } catch (error) {
        hideLoading();
        showAlert('Erro ao carregar dashboard', 'danger');
    }
}

// Render Stats
function renderStats(stats) {
    document.getElementById('content').innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon primary">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-info">
                    <h3>${stats.total}</h3>
                    <p>Total de Clientes</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon success">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-info">
                    <h3>${stats.active}</h3>
                    <p>Assinaturas Ativas</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon warning">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-info">
                    <h3>${stats.trial}</h3>
                    <p>Em Trial</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon danger">
                    <i class="fas fa-ban"></i>
                </div>
                <div class="stat-info">
                    <h3>${stats.suspended}</h3>
                    <p>Suspensas</p>
                </div>
            </div>
        </div>
        
        <div class="table-container">
            <div class="table-header">
                <h5><i class="fas fa-building"></i> Clientes Recentes</h5>
                <button class="btn btn-primary" onclick="showAddTenantModal()">
                    <i class="fas fa-plus"></i> Novo Cliente
                </button>
            </div>
            <div id="tenantsTable"></div>
        </div>
    `;
}

// Render Tenants Table
function renderTenantsTable(tenants) {
    const tableHTML = `
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Provedor</th>
                        <th>CNPJ</th>
                        <th>Responsável</th>
                        <th>Status</th>
                        <th>Valor</th>
                        <th>Vencimento</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${tenants.map(tenant => `
                        <tr>
                            <td><strong>${tenant.provedor.nome}</strong></td>
                            <td>${formatCNPJ(tenant.cnpj)}</td>
                            <td>${tenant.responsavel}</td>
                            <td>${getStatusBadge(tenant.assinatura.status)}</td>
                            <td>R$ ${tenant.assinatura.valor.toFixed(2)}</td>
                            <td>${formatDate(tenant.assinatura.data_vencimento)}</td>
                            <td>
                                <button class="btn btn-sm btn-primary" onclick="viewTenant('${tenant.id}')">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-success" onclick="toggleStatus('${tenant.id}', ${tenant.assinatura.ativa})">
                                    <i class="fas fa-${tenant.assinatura.ativa ? 'pause' : 'play'}"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    document.getElementById('tenantsTable').innerHTML = tableHTML;
}

// Get Status Badge
function getStatusBadge(status) {
    const badges = {
        active: '<span class="badge success">Ativo</span>',
        trial: '<span class="badge warning">Trial</span>',
        suspended: '<span class="badge danger">Suspenso</span>',
        cancelled: '<span class="badge danger">Cancelado</span>'
    };
    return badges[status] || '<span class="badge primary">-</span>';
}

// Format CNPJ
function formatCNPJ(cnpj) {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

// Format Date
function formatDate(date) {
    return new Date(date).toLocaleDateString('pt-BR');
}

// Toggle Tenant Status
async function toggleStatus(tenantId, isActive) {
    if (!confirm(`Deseja ${isActive ? 'desativar' : 'ativar'} esta assinatura?`)) return;
    
    try {
        const tenant = tenants.find(t => t.id === tenantId);
        await apiCall('/assinatura', {
            method: 'POST',
            body: JSON.stringify({ cnpj: tenant.cnpj })
        });
        
        showAlert('Status atualizado com sucesso!', 'success');
        loadDashboard();
    } catch (error) {
        showAlert('Erro ao atualizar status', 'danger');
    }
}

// View Tenant Details
function viewTenant(tenantId) {
    const tenant = tenants.find(t => t.id === tenantId);
    alert(`Detalhes do Tenant:\n\nNome: ${tenant.provedor.nome}\nCNPJ: ${tenant.cnpj}\nStatus: ${tenant.assinatura.status}`);
}

// Show Alert
function showAlert(message, type = 'info') {
    // Implementar sistema de toast/alert
    alert(message);
}

// Loading
function showLoading() {
    document.getElementById('content').innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p class="mt-3">Carregando...</p>
        </div>
    `;
}

function hideLoading() {
    // Removido pelo render
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadDashboard();
    
    // Set user info
    const user = localStorage.getItem('admin_user');
    if (user) {
        const userData = JSON.parse(user);
        document.getElementById('userName').textContent = userData.name || 'Admin';
        document.getElementById('userAvatar').textContent = (userData.name || 'A')[0].toUpperCase();
    }
});
