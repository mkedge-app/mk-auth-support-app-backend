# 🌐 Frontend Completo - MK-Edge

Sistema completo com Landing Page, Dashboard Admin e Portal do Cliente integrado.

## 📂 Estrutura de Arquivos

```
public/
├── index.html              # Landing Page (/)
├── admin/
│   ├── login.html         # Login Admin (/admin/)
│   └── dashboard.html     # Dashboard Admin (/admin/dashboard.html)
├── portal/
│   └── index.html         # Portal do Cliente (/portal/)
└── assets/
    ├── css/
    ├── js/
    └── images/
```

## 🔗 URLs de Acesso

### Landing Page
- **URL:** `http://seudominio.com.br` ou `http://172.31.255.3`
- **Descrição:** Site institucional com captação de clientes
- **Arquivo:** `/public/index.html`

### Dashboard Administrativo
- **Login:** `http://seudominio.com.br/admin/` → Redireciona para `/admin/login.html`
- **Dashboard:** `http://seudominio.com.br/admin/dashboard.html`
- **Credenciais Padrão:**
  - Usuário: `admin`
  - Senha: `admin123`
  - ⚠️ **IMPORTANTE:** Altere estas credenciais em produção!

### Portal do Cliente
- **URL:** `http://seudominio.com.br/portal/`
- **Descrição:** Área do cliente para self-service
- **Status:** Em desenvolvimento

## 🚀 Como Funciona

### Roteamento

O Express foi configurado para servir arquivos estáticos e rotear corretamente:

```javascript
// Arquivos estáticos
app.use(express.static('public'));

// Rotas de API com prefixo /api
app.use('/api', routes);

// Redirecionamentos
/admin → /admin/login.html
/portal → /portal/index.html

// Landing page em qualquer outra rota
/* → /index.html
```

### Endpoints da API

Todas as rotas de API agora devem ser acessadas com o prefixo `/api`:

```bash
# Antes
GET /providers

# Agora
GET /api/providers
```

**Rotas públicas (sem autenticação):**
- `GET /api/providers` - Lista todos os tenants
- `POST /api/provider` - Cria novo tenant
- `PUT /api/provider/:id` - Atualiza tenant
- `GET /api/provider/:id` - Detalhes do tenant
- `POST /api/webhook/efi/pix` - Webhook EFI Pix
- `POST /api/webhook/efi/boleto` - Webhook EFI Boleto
- `POST /api/webhook/zapi` - Webhook Z-API

**Rotas de assinatura:**
- `GET /api/subscriptions` - Lista assinaturas
- `POST /api/subscription` - Cria assinatura
- `POST /api/subscription/:id/invoice` - Gera fatura
- `POST /api/subscription/:id/cancel` - Cancela assinatura

## 🎨 Recursos Visuais

### Landing Page
- ✅ Design moderno e responsivo
- ✅ Seção Hero com CTA
- ✅ Cards de recursos
- ✅ Preços transparentes (R$ 100/mês)
- ✅ Formulário de contato
- ✅ Footer completo
- ✅ Animações (AOS)
- ✅ Bootstrap 5

### Dashboard Admin
- ✅ Sidebar com menu
- ✅ Cards de estatísticas
- ✅ Tabela de tenants
- ✅ Botões de ação (editar, excluir, gerenciar)
- ✅ Design responsivo
- ✅ Integrado com API

## 🔧 Configuração

### 1. Estrutura criada automaticamente

Os arquivos foram criados em `/public/`:
- Landing page
- Dashboard admin
- Portal do cliente (estrutura)

### 2. Express configurado

O `app.js` foi atualizado para:
- Servir arquivos estáticos
- Rotear corretamente
- Manter compatibilidade com API

### 3. Sem necessidade de build

Tudo em HTML/CSS/JS puro, sem frameworks complexos.

## 🚦 Testando

### 1. Inicie o servidor
```bash
npm run dev
```

### 2. Acesse as URLs

**Landing Page:**
```
http://localhost:3333
```

**Admin:**
```
http://localhost:3333/admin/
Login: admin / Senha: admin123
```

**API:**
```bash
curl http://localhost:3333/api/providers
```

## 🔐 Segurança

### ⚠️ IMPORTANTE - Produção

1. **Altere as credenciais do admin**
   - Atualmente usa login hardcoded
   - Implemente autenticação real com JWT
   - Armazene senhas com bcrypt

2. **Configure HTTPS**
   - Use certificado SSL
   - Redirecione HTTP → HTTPS

3. **Proteja rotas de API**
   - Implemente autenticação
   - Use tokens JWT
   - Valide permissões

4. **Rate Limiting**
   - Já configurado no Express
   - Ajuste limites conforme necessidade

## 🔄 Próximos Passos

### Dashboard Admin - Melhorias

1. **Formulários completos**
   - Criar tenant
   - Editar tenant
   - Gerenciar assinatura
   - Configurar credenciais EFI/Z-API

2. **Páginas adicionais**
   - Lista de faturas
   - Histórico de pagamentos
   - Relatórios e gráficos
   - Configurações gerais

3. **Autenticação real**
   - Integrar com API de usuários
   - JWT tokens
   - Recuperação de senha

### Portal do Cliente

1. **Cadastro self-service**
   - Formulário completo
   - Integração com API
   - Geração automática de assinatura

2. **Área logada**
   - Dashboard do cliente
   - Visualizar faturas
   - Histórico de pagamentos
   - Atualizar dados

3. **Pagamentos**
   - Página de pagamento Pix
   - Exibir QR Code
   - Boleto para impressão
   - Confirmação automática

## 📱 Mobile

O design é **100% responsivo**:
- Landing page adaptada
- Dashboard funciona em tablets
- Portal otimizado para mobile

## 🐛 Problemas Conhecidos

### /lp1 antigo

O domínio `mk-edge.com.br` estava redirecionando para `/lp1`. 

**Solução aplicada:**
- Removido redirecionamento /lp1
- Landing page agora é diretamente na raiz `/`
- Configure seu servidor web (Nginx/Apache) para apontar diretamente

### Nginx Config

Se usar Nginx, configure assim:

```nginx
server {
    listen 80;
    server_name mk-edge.com.br www.mk-edge.com.br;
    
    location / {
        proxy_pass http://localhost:3333;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📞 Suporte

Dúvidas sobre o frontend?
- Email: suporte@mkedge.com.br
- WhatsApp: (11) 99999-9999

---

**Desenvolvido com ❤️ para MK-Edge**
