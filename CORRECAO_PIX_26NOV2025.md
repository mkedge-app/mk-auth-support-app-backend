# Correção do PIX no InvoiceController

**Data:** 26 de Novembro de 2025  
**Arquivo modificado:** `src/app/controllers/InvoiceController.js`

## 🐛 Problema Identificado

O app mobile estava retornando:
```
LOG 📄 PIX QRCode URL: undefined
LOG 📄 PIX QRCode: undefined
"pix": null
```

### Causa Raiz

O campo `titulo` na tabela `sis_qrpix` está armazenado em **MAIÚSCULAS**:
- Exemplo: `000EAFDC-DD80-4C42-B17E-E0EFEA2CEBB4`

Porém, o `uuid_lanc` das faturas (`sis_lanc`) pode estar em minúsculas ou formato misto.

A query original era:
```javascript
const qrpix = await QRPix.findOne({
  where: { titulo: uuid_lanc }
});
```

Isso falhava porque a comparação é **case-sensitive** por padrão.

## ✅ Solução Implementada

### 1. Imports Adicionados
```javascript
import { Op, where, fn, col } from 'sequelize';
```

### 2. Query Modificada para Case-Insensitive
```javascript
const qrpix = await QRPix.findOne({
  where: where(
    fn('UPPER', col('titulo')),
    '=',
    uuid_lanc ? uuid_lanc.toUpperCase() : ''
  )
});
```

Agora a comparação é feita com ambos os valores em UPPER CASE.

### 3. Logs Adicionados para Debug
```javascript
console.log(`🔍 Buscando PIX para uuid_lanc: ${uuid_lanc}`);
console.log(`📄 Resultado PIX:`, qrpix ? 'ENCONTRADO' : 'NÃO ENCONTRADO');
console.log(`🔑 QRCode encontrado (primeiros 50 chars): ${qrpix.qrcode.substring(0, 50)}...`);
console.log(`✅ PIX montado com sucesso para título ${titulo}`);
console.log(`🔗 URL do QRCode: ${linkQrcode}`);
console.log(`🆔 Hash MD5: ${qrhash}`);
```

## 📊 Resultado Esperado

Agora o response da API deve incluir:
```json
{
  "pix": {
    "qrcode": "00020101021226990014BR.GOV.BCB.PIX...",
    "qrcode_hash": "a1b2c3d4e5f6...",
    "qrcode_url": "https://provedor.updata.com.br/boleto/qrcode/PIX.a1b2c3d4e5f6.png"
  }
}
```

## 🔄 Deploy

```bash
cd /srv/mk-auth-support-app-backend
npm run build
pm2 restart server --update-env
```

## 📝 Backup

Backup criado em:
- `/srv/mk-auth-support-app-backend/src/app/controllers/InvoiceController.js.backup2`

## ✅ Verificação

Para verificar os logs:
```bash
pm2 logs server --lines 100 | grep -i "pix\|qrcode"
```

Para testar a query diretamente no banco:
```sql
SELECT titulo, LEFT(qrcode, 50) as qrcode_preview 
FROM sis_qrpix 
WHERE UPPER(titulo) = UPPER('0196c5c9-5dc3-75de-b02e-dcbc317cb37a');
```
