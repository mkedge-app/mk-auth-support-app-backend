# Sistema de Autenticação Admin - Mk-Edge

## ✅ Sistema Implementado com Sucesso!

O sistema de autenticação admin foi completamente implementado usando **MongoDB** para armazenar os usuários administrativos.

---

## 🔐 Credenciais de Acesso

**URL:** http://localhost:3333/admin/login.html

**Usuário padrão:**
- **Username:** `admin`
- **Password:** `admin123`

⚠️ **IMPORTANTE:** Altere a senha após o primeiro login!

---

## 🏗️ Arquitetura Implementada

### Modelo de Dados (MongoDB)
- **Arquivo:** `src/app/models/AdminUser.js`
- **Collection:** `adminusers`
- **Campos:**
  - `username` (único, lowercase)
  - `name`
  - `email` (único, lowercase)
  - `password` (hash bcrypt, não exposto no JSON)
  - `type` (super | admin)
  - `active` (boolean)
  - `lastLogin` (data)
  - `createdAt`, `updatedAt` (timestamps automáticos)

### Controller de Sessão
- **Arquivo:** `src/app/controllers/AdminSessionController.js`
- **Rotas:**
  - `POST /admin/login` - Login (público)
  - `GET /admin/validate` - Validar token (protegido)

### Middleware de Autenticação
- **Arquivo:** `src/app/middlewares/adminAuth.js`
- **Função:** Validar JWT em rotas `/admin/*`
- **Token:** Bearer Token no header `Authorization`
- **Expiração:** 7 dias

### Rotas Protegidas
Todas as rotas administrativas estão protegidas:
- `GET /admin/validate`
- `GET /admin/providers`
- `POST /admin/provider`
- `PUT /admin/provider/:id`
- `DELETE /admin/provider/:id`
- `PUT /admin/tenant/:id/plan`
- `GET /admin/plans`
- `POST /admin/plan/:id/toggle`
- `DELETE /admin/plan/:id`

---

## 🔑 Fluxo de Autenticação

### 1. Login
```bash
curl -X POST http://localhost:3333/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**Resposta:**
```json
{
  "user": {
    "id": "692f45288bea55a4448d86f6",
    "username": "admin",
    "name": "Administrador",
    "email": "admin@mk-edge.com.br",
    "type": "super"
  },
  "token": "eyJhbGci..."
}
```

### 2. Usar Token em Requisições
```bash
TOKEN="seu_token_aqui"

curl -X GET http://localhost:3333/admin/providers \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Validar Token
```bash
curl -X GET http://localhost:3333/admin/validate \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📁 Arquivos do Frontend

### Login
- **Arquivo:** `public/admin/login.html`
- **Funcionalidade:** 
  - Validação automática de token ao carregar
  - Login com usuário/senha
  - Armazenamento de token no localStorage
  - Redirecionamento para dashboard após login

### Dashboard
- **Arquivo:** `public/admin/dashboard.html`
- **Funcionalidades:**
  - Validação de token ao carregar
  - Todas requisições incluem header `Authorization`
  - Logout limpa token e redireciona
  - Função `authFetch()` para requisições autenticadas

---

## 🛠️ Como Criar Novos Admins

Execute o script de criação:

```bash
cd /srv/mk-auth-support-app-backend
node create-admin.js
```

Ou crie manualmente via MongoDB:

```javascript
use mkedgetenants

db.adminusers.insertOne({
  username: "novoadmin",
  name: "Novo Administrador",
  email: "novo@mk-edge.com.br",
  password: "$2a$10$hash_bcrypt_aqui",
  type: "admin",
  active: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

**Nota:** O password deve ser um hash bcrypt. O sistema faz hash automático ao salvar pelo script.

---

## 🔒 Segurança

### Implementações:
✅ Senha hasheada com bcrypt (salt de 10 rounds)
✅ Token JWT assinado com chave secreta
✅ Validação de tipo de usuário (super/admin)
✅ Verificação de status ativo
✅ Token expira em 7 dias
✅ Password nunca exposto em JSON responses
✅ Middleware protege todas rotas admin

### Chave JWT:
- **Variável de ambiente:** `JWT_SECRET`
- **Fallback:** `'mk-edge-super-secret-key-2024'`

⚠️ **IMPORTANTE:** Configure `JWT_SECRET` em produção!

```bash
export JWT_SECRET="sua-chave-super-secreta-aqui"
```

---

## 🚀 Deploy

### 1. Build
```bash
npm run build
```

### 2. Start
```bash
npm start
```

### 3. Com PM2 (recomendado)
```bash
pm2 start dist/server.js --name mk-edge-backend
pm2 save
pm2 startup
```

---

## 📊 Status Atual

### ✅ Completo:
- [x] Modelo AdminUser com Mongoose
- [x] Controller de sessão com JWT
- [x] Middleware de autenticação
- [x] Rotas protegidas
- [x] Frontend com autenticação
- [x] Dashboard usando rotas protegidas
- [x] Script de criação de admin
- [x] Primeiro admin criado

### 🔄 Próximos Passos:
- [ ] Modal de criação/edição de planos
- [ ] View de assinaturas
- [ ] View de faturas
- [ ] View de configurações/integrações
- [ ] Troca de senha no dashboard
- [ ] Listagem e gestão de admins

---

## 📞 Suporte

Para reportar problemas ou sugestões, contate o time de desenvolvimento.

---

**Versão:** 1.0  
**Data:** 2025-01-02  
**Autor:** GitHub Copilot
