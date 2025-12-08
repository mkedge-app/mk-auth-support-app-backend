# Implementação Backend - Sistema de Mapas e CTOs

## ✅ Alterações Concluídas

### 1. Banco de Dados - Migrations

#### Migration 1: Adicionar API Key do Google Maps
**Arquivo:** `src/database/migrations/20251207000001-add-google-maps-api-key-to-provedores.js`

Adiciona coluna `google_maps_api_key` na tabela `sis_provedor`:

```sql
ALTER TABLE sis_provedor 
ADD COLUMN google_maps_api_key VARCHAR(255);
```

#### Migration 2: Criar Índice para CTOs
**Arquivo:** `src/database/migrations/20251207000002-add-index-cto-coordinates.js`

Cria índice composto para otimizar buscas por coordenadas:

```sql
CREATE INDEX idx_cto_lat_lng ON mp_caixa(latitude, longitude);
```

### 2. Models Atualizados

#### SisProvedor.js
- Adicionado campo `google_maps_api_key: Sequelize.STRING`

#### CTO.js
- Alterado tipo de `latitude` e `longitude` de STRING para DECIMAL(10,8) e DECIMAL(11,8)
- Melhora performance com o novo índice

### 3. Endpoints Implementados

#### ✅ GET /provedor
**Rota:** `routes.get('/provedor', ProviderController.show)`

Retorna dados do provedor/tenant incluindo a chave da API do Google Maps:

```json
{
  "id": "...",
  "provedor": {
    "nome": "Provider Name"
  },
  "google_maps_api_key": "AIza...",
  "database": { ... },
  "assinatura": { ... }
}
```

**Também disponível em:**
- `GET /tenant` (rota original)

#### ✅ GET /cto/:lat/:lng
**Rotas:** 
- `routes.get('/cto/:latitude/:longitude', CTOController.index)`
- `routes.get('/cto/:lat/:lng', CTOController.index)` (alias)

Retorna CTOs próximas dentro de um raio de 350 metros:

```json
[
  {
    "id": 123,
    "nome": "CTO-001",
    "latitude": "-23.5505",
    "longitude": "-46.6333",
    "connection_amount": 15
  }
]
```

**Funcionalidades:**
- Filtra CTOs em raio de 0.35km (350 metros)
- Calcula distância usando fórmula de Haversine
- Retorna quantidade de clientes ativos por CTO
- Usa índice `idx_cto_lat_lng` para melhor performance

#### ✅ PUT /cliente/:id
**Rotas:**
- `routes.put('/client/:id', ClientController.update)`
- `routes.put('/cliente/:id', ClientController.update)` (português)
- `routes.post('/client/:id', ClientController.update)` (mantido por compatibilidade)

Aceita campo `coordenadas` ou `latitude` e `longitude` separados:

**Body:**
```json
{
  "latitude": -23.5505,
  "longitude": -46.6333,
  "new_cto": "CTO-001",
  "observacao": "Cliente verificado",
  "celular": "11999999999",
  "endereco_res": "Rua Exemplo",
  "numero_res": "123",
  "bairro_res": "Centro"
}
```

**Resposta:**
```json
{
  "id": 456,
  "nome": "Cliente Teste",
  "coordenadas": "-23.5505,-46.6333",
  "caixa_herm": "CTO-001",
  ...
}
```

### 4. Rotas Adicionais (Bonus)

Foram adicionadas rotas alias em português para melhor usabilidade:

- `GET /provedor` → alias de `/tenant`
- `GET /cliente/:id` → alias de `/client/:id`
- `GET /cto/:lat/:lng` → alias de `/cto/:latitude/:longitude`
- `PUT /cliente/:id` → método PUT para atualização RESTful

## 📋 Como Executar

### 1. Instalar Dependências (✅ Concluído)
```bash
npm install
```

### 2. Executar Migrations
**IMPORTANTE:** Certifique-se que o banco de dados está acessível.

```bash
# Para cada provedor/tenant, execute as migrations:
npx sequelize-cli db:migrate
```

Ou execute manualmente as queries SQL:

```sql
-- Migration 1: Adicionar API Key
ALTER TABLE sis_provedor 
ADD COLUMN google_maps_api_key VARCHAR(255);

-- Migration 2: Criar Índice
CREATE INDEX idx_cto_lat_lng ON mp_caixa(latitude, longitude);
```

### 3. Configurar API Key do Google Maps

#### Opção 1: Via MongoDB (Tenant Schema)
```javascript
// Já está implementado no Tenant Schema
db.tenants.updateOne(
  { _id: ObjectId("tenant_id") },
  { $set: { google_maps_api_key: "AIza..." } }
)
```

#### Opção 2: Via Tabela sis_opcao (Por provedor)
```sql
INSERT INTO sis_opcao (nome, valor) 
VALUES ('key_googlemaps', 'AIza...')
ON DUPLICATE KEY UPDATE valor = 'AIza...';
```

### 4. Testar os Endpoints

#### Teste 1: Obter dados do provedor
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3333/provedor
```

#### Teste 2: Buscar CTOs próximas
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3333/cto/-23.5505/-46.6333"
```

#### Teste 3: Atualizar coordenadas do cliente
```bash
curl -X PUT \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"latitude": -23.5505, "longitude": -46.6333}' \
  http://localhost:3333/cliente/123
```

## 🎯 Melhorias Implementadas

1. **Performance:**
   - Índice composto em coordenadas de CTOs
   - Tipos DECIMAL otimizados para coordenadas

2. **REST Compliance:**
   - Método PUT para atualizações
   - Rotas semânticas e consistentes

3. **Internacionalização:**
   - Rotas em português como aliases
   - Compatibilidade com rotas antigas

4. **Segurança:**
   - Todas as rotas protegidas por autenticação JWT
   - ConnectionResolver para multi-tenant

## 📝 Observações

- As migrations foram criadas mas precisam de conexão com o banco para executar
- O código já está preparado para funcionar com as alterações no banco
- A API Key pode ser configurada por tenant (MongoDB) ou por provedor (sis_opcao)
- O endpoint de CTOs usa a mesma lógica existente, apenas com rotas adicionais

## 🚀 Próximos Passos

1. Conectar ao banco de dados e executar migrations
2. Configurar API Keys do Google Maps para cada provedor
3. Testar endpoints com dados reais
4. Integrar com o frontend mobile (Expo)
5. Implementar cache para resultados de CTOs próximas (opcional)
