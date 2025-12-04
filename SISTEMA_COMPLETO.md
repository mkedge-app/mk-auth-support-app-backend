# MK-Edge - Sistema Completo de Gestão de Suporte

## 🚀 Visão Geral

Sistema completo de gestão de suporte técnico com cobrança automatizada via PIX/Boleto (EFI) e notificações WhatsApp (Z-API).

## 📋 Estrutura do Projeto

```
/srv/mk-auth-support-app-backend/    # Backend Node.js
/var/www/html/
  ├── index.html                     # Landing Page
  ├── admin/                         # Admin Angular (legado)
  ├── admin-novo/                    # Dashboard Admin Moderno
  └── portal/                        # Portal do Cliente
```

## 🌐 URLs Disponíveis

- **Landing Page**: http://172.31.255.3/ ou http://mk-edge.com.br/
- **Dashboard Admin**: http://172.31.255.3/admin-novo/
- **Portal Cliente**: http://172.31.255.3/portal/
- **Admin Legado**: http://172.31.255.3/admin/ (login: admin / F@lcon31)
- **API Backend**: http://172.31.255.3/api/

## 🛠️ Tecnologias

### Backend
- Node.js + Express
- MongoDB (Tenants, Subscriptions, Invoices)
- MySQL + Sequelize (Dados de clientes)
- PM2 (Process Manager)
- Apache 2.4 (Reverse Proxy)

### Integrações
- **EFI (Gerencianet)**: PIX e Boleto
- **Z-API**: WhatsApp Business
- **OneSignal**: Push Notifications

### Frontend
- HTML5 + CSS3 + JavaScript
- Font Awesome Icons
- Google Fonts (Inter)

## 📦 Instalação e Configuração

### 1. Backend (Já configurado)

```bash
# Backend rodando via PM2
cd /srv/mk-auth-support-app-backend
pm2 list  # Verificar status

# Reiniciar se necessário
pm2 restart mk-edge-api
pm2 logs mk-edge-api
```

### 2. Apache

```bash
# Verificar status
sudo systemctl status apache2

# Configuração em
sudo nano /etc/apache2/sites-available/mk-edge-api.conf

# Recarregar após mudanças
sudo systemctl reload apache2
```

### 3. Banco de Dados

**MongoDB** (Porta 27017)
- Database: mk-edge-tenants
- Collections: tenants, subscriptions, invoices

**MySQL** (Porta 3306)
- Databases por tenant: mkradius_*

## 🎯 Funcionalidades Principais

### Landing Page (/)
- ✅ Design moderno e responsivo
- ✅ Formulário de assinatura com 7 dias grátis
- ✅ Seção de recursos e preços
- ✅ Integração com API de criação de contas

### Dashboard Admin (/admin-novo/)
- ✅ Gestão completa de clientes (Tenants)
- ✅ Controle de assinaturas
- ✅ Visualização de faturas
- ✅ Configuração EFI e Z-API
- ✅ Envio de notificações WhatsApp
- ✅ Dashboard com métricas

### Portal do Cliente (/portal/)
- ✅ Login com CNPJ e Email
- ✅ Visualização de assinatura
- ✅ Dados da empresa
- ✅ Histórico de faturas
- ✅ Pagamento via PIX (QR Code)

## 🔌 API Endpoints

### Assinaturas
```
GET    /api/subscriptions              # Listar todas
GET    /api/subscription/:id           # Detalhes
POST   /api/subscription               # Criar nova
POST   /api/subscription/:id/invoice   # Gerar fatura
POST   /api/subscription/:id/suspend   # Suspender
POST   /api/subscription/:id/reactivate # Reativar
POST   /api/subscription/:id/cancel    # Cancelar
DELETE /api/subscription/:id           # Deletar
```

### Tenants (Provedores)
```
GET    /api/providers                  # Listar todos
```

### Webhooks
```
POST   /webhook/efi/pix               # Notificação PIX
POST   /webhook/efi/boleto            # Notificação Boleto
```

## ⚙️ Configuração de Integrações

### EFI (Gerencianet)

1. **Obter Credenciais**:
   - Acesse: https://gerencianet.com.br
   - Gere Client ID e Client Secret
   - Baixe o certificado (.p12)

2. **Configurar no Sistema**:
   - Acesse Dashboard Admin → Configurações
   - Preencha Client ID, Client Secret
   - Upload do certificado para: `/srv/mk-auth-support-app-backend/certificates/`
   - Marque Sandbox (teste) ou Produção

3. **Webhook EFI**:
   ```
   URL: http://seu-dominio.com/webhook/efi/pix
   ```

### Z-API (WhatsApp)

1. **Criar Instância**:
   - Acesse: https://www.z-api.io
   - Crie uma instância e conecte o WhatsApp
   - Copie: Instance ID, Token, Client Token

2. **Configurar no Sistema**:
   - Dashboard Admin → Configurações
   - Preencha os dados da Z-API

### Templates WhatsApp Disponíveis
- `boasVindas`: Mensagem de boas-vindas
- `lembreteVencimento`: Lembrete 3 dias antes
- `faturaPaga`: Confirmação de pagamento
- `suspensao`: Aviso de suspensão
- `reativacao`: Confirmação de reativação

## 🤖 Jobs Automatizados

### BillingJob (Diário - 09:00)
```javascript
// Tarefas executadas:
1. Gera faturas para assinaturas vencendo em 3 dias
2. Envia lembretes de vencimento (WhatsApp)
3. Suspende assinaturas com mais de 5 dias de atraso
```

**Configurar Cron** (se necessário):
```bash
crontab -e

# Adicionar (executar às 09:00 diariamente)
0 9 * * * cd /srv/mk-auth-support-app-backend && node -e "require('./src/app/jobs/BillingJob').run()"
```

## 🔐 Segurança

### Acesso Admin Legado
- **URL**: /admin/
- **Login**: admin
- **Senha**: F@lcon31

### Firewall
```bash
# Portas necessárias
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3333/tcp  # API (somente localhost)
```

### HTTPS (Recomendado)
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-apache

# Gerar certificado SSL
sudo certbot --apache -d mk-edge.com.br -d www.mk-edge.com.br
```

## 📊 Monitoramento

### PM2 Dashboard
```bash
# Ver logs em tempo real
pm2 logs mk-edge-api

# Monitorar recursos
pm2 monit

# Informações detalhadas
pm2 show mk-edge-api
```

### Apache Logs
```bash
# Erros
sudo tail -f /var/log/apache2/error.log

# Acesso
sudo tail -f /var/log/apache2/access.log
```

## 🔄 Workflow de Assinatura

1. **Cliente se cadastra** (Landing Page)
   - Cria conta com 7 dias de trial
   - Gera tenant no MongoDB
   - Cria database MySQL

2. **Trial ativo**
   - Status: `trial`
   - Sem cobrança

3. **Fim do Trial** (7 dias)
   - BillingJob gera primeira fatura
   - Envia PIX via EFI
   - Notifica WhatsApp

4. **Pagamento recebido**
   - Webhook EFI atualiza fatura
   - Status: `ativa`
   - Notifica cliente

5. **Renovação mensal**
   - 3 dias antes: gera fatura
   - 2 dias antes: lembrete WhatsApp
   - No vencimento: gera cobrança

6. **Inadimplência**
   - +5 dias: suspende serviço
   - +10 dias: notifica cancelamento

## 🐛 Troubleshooting

### API não responde
```bash
# Verificar PM2
pm2 list
pm2 restart mk-edge-api

# Verificar porta
netstat -tlnp | grep 3333
```

### Apache não funciona
```bash
# Verificar configuração
sudo apache2ctl configtest

# Reiniciar
sudo systemctl restart apache2

# Ver erros
sudo journalctl -xe -u apache2
```

### MongoDB não conecta
```bash
# Verificar status
sudo systemctl status mongod

# Reiniciar
sudo systemctl restart mongod

# Ver logs
sudo journalctl -u mongod
```

### Webhooks não chegam
1. Verificar firewall (porta 80/443 aberta)
2. Testar URL externamente
3. Verificar logs: `pm2 logs mk-edge-api`
4. Confirmar URL no painel EFI

## 📈 Próximos Passos

### Melhorias Recomendadas
- [ ] Implementar autenticação JWT no admin
- [ ] Adicionar dashboard de métricas (Chart.js)
- [ ] Criar API para faturas no portal
- [ ] Implementar email marketing (SendGrid)
- [ ] Adicionar relatórios em PDF
- [ ] Sistema de tickets de suporte
- [ ] Integração com gateway adicional (PagSeguro/MercadoPago)

### Escalabilidade
- [ ] Redis para cache e sessions
- [ ] Load balancer com Nginx
- [ ] Cluster PM2 (múltiplas instâncias)
- [ ] MongoDB Replica Set
- [ ] CDN para assets estáticos

## 📞 Suporte

Para suporte técnico:
- Email: suporte@mk-edge.com.br
- WhatsApp: (XX) XXXXX-XXXX

---

**Versão**: 1.0.0  
**Data**: Janeiro 2025  
**Desenvolvido por**: MK-Edge Team
