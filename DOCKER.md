# MK-Edge Backend - Docker

Backend containerizado do sistema MK-Edge.

## 🚀 Quick Start

### 1. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais:
- MongoDB password
- JWT secret
- EFI credentials
- Z-API credentials

### 2. Coloque o certificado EFI

```bash
# Coloque seu certificado .p12 da EFI em:
./cert/producao.p12
```

### 3. Inicie os containers

```bash
docker-compose up -d
```

### 4. Verifique os logs

```bash
docker-compose logs -f api
```

### 5. Acesse a API

```
http://localhost:3333
```

## 📦 Containers

- **api**: Node.js backend (porta 3333)
- **mongo**: MongoDB 6 (porta 27017)
- **redis**: Redis 7 (porta 6379)

## 🛠️ Comandos Úteis

```bash
# Ver status
docker-compose ps

# Parar tudo
docker-compose down

# Rebuild
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Executar comandos dentro do container
docker-compose exec api sh

# Limpar volumes (CUIDADO: apaga dados)
docker-compose down -v
```

## 🔧 Desenvolvimento

Para desenvolvimento local SEM Docker:

```bash
npm install
npm run dev
```

## 📝 Variáveis Importantes

| Variável | Descrição |
|----------|-----------|
| `MONGODB_PASSWORD` | Senha do MongoDB |
| `JWT_SECRET` | Secret para tokens JWT |
| `EFI_CLIENT_ID` | Client ID da EFI |
| `EFI_CLIENT_SECRET` | Secret da EFI |
| `ZAPI_TOKEN` | Token do Z-API |

## 🏥 Health Check

```bash
curl http://localhost:3333/health
```

## 🐛 Troubleshooting

### Container não inicia

```bash
docker-compose logs api
```

### MongoDB não conecta

Verifique se a senha está correta no `.env`

### Certificado EFI não encontrado

Certifique-se que o arquivo está em `./cert/producao.p12`
