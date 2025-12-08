# Revisão de Endpoints - Abertura de Chamado e Baixa de Fatura

## 📋 Análise Comparativa

### 1. Abertura de Chamado (sis_suporte)

#### Formulário HTML Original
```html
<form method="POST" action="executar_suporte.hhvm?acao=ins.chamado">
```

**Campos do Formulário:**
- `cliente` - Nome do cliente (readonly)
- `chamado` - ID do chamado gerado (07122515332332)
- `abertura` - Data de abertura (07/12/2025 15:33:23)
- `atendente` - Nome do atendente (Antonio Brito Lima)
- `tecnico` - ID do técnico (select)
- `visita_data` - Data da visita (date input)
- `visita_hora` - Hora da visita (time input)
- `prioridade` - Prioridade (baixa/normal/alta)
- `ramal` - Ramal BRAS
- `assunto` - Assunto do chamado
- `msg` - Mensagem/descrição
- `uuid_cliente` - UUID do cliente (hidden)

#### Endpoint Atual - POST /request

**✅ Status:** FUNCIONAL mas com MELHORIAS NECESSÁRIAS

**Campos Aceitos:**
```javascript
{
  client_id,         // ✅ Implementado
  id_cliente,        // ✅ Implementado
  uuid_cliente,      // ✅ Implementado
  assunto,           // ✅ Implementado
  mensagem,          // ✅ Implementado
  msg,               // ✅ Implementado
  tecnico,           // ✅ Implementado
  employee_id,       // ✅ Implementado
  prioridade,        // ✅ Implementado
  visita_data,       // ✅ Implementado
  visita_hora,       // ✅ Implementado
  data_visita,       // ✅ Implementado
  visita,            // ✅ Implementado
  ramal,             // ✅ Implementado
  atendente,         // ✅ Implementado
  status             // ✅ Implementado
}
```

**🔧 Campos FALTANTES no Model (SupportRequest.js):**
- `ramal` - Campo não existe no model
- `uuid_suporte` - Campo no HTML mas não no model
- `login_atend` - Campo existe no model mas não usado no controller

**Resposta do Endpoint:**
```javascript
{
  id: 123,
  chamado: "07122515332332",
  login: "cliente_login",
  nome: "Nome do Cliente",
  assunto: "Conexão",
  status: "aberto",
  prioridade: "normal",
  visita: "2025-12-09T15:33:00.000Z",
  tecnico: 2,
  employee_name: "Antonio Brito Lima",
  atendente: "BRAS-01 - CCR-1016-101",
  endereco: "Rua Exemplo",
  numero: "123",
  bairro: "Centro",
  telefone: "9999-9999",
  celular: "99999-9999",
  created_at: "2025-12-07T15:33:23.000Z"
}
```

---

### 2. Baixa de Fatura (sis_lanc)

#### Formulário HTML Original
```html
<form method="POST" action="executar_titulo.hhvm?acao=rec.titulo">
```

**Campos do Formulário:**
- `id` - ID do título (130761)
- `data` - Data pagamento (datetime-local)
- `formapag` - Forma de pagamento (select)
- `fcartaobandeira` - Bandeira do cartão (se cartão)
- `fcartaonumero` - Número do cartão (se cartão)
- `fchequebanco` - Banco do cheque (se cheque)
- `fchequenumero` - Número do cheque (se cheque)
- `fchequeagcc` - Agência/conta do cheque (se cheque)
- `acrescimo` - Valor de acréscimo
- `multa_mora` - Multa e mora
- `insnext` - Incluir juros em próxima mensalidade (sim/nao/nada)
- `desconto` - Valor de desconto
- `valor` - Valor pago final
- `valortit` - Valor original do título
- `mmenviar` - Campo adicional
- `excluir_efipay` - Excluir título na EfiPay (s/n)
- `ttoken_baixar` - Token de segurança

#### Endpoint Atual - POST /invoice/pay

**⚠️ Status:** BÁSICO - PRECISA DE EXPANSÃO

**Campos Aceitos Atualmente:**
```javascript
{
  invoice_id,  // ✅ Implementado
  titulo,      // ✅ Implementado
  uuid_lanc    // ✅ Implementado
}
```

**🔴 Campos FALTANTES (do formulário original):**
- `data_pagamento` - Data do pagamento
- `formapag` - Forma de pagamento
- `acrescimo` - Acréscimo
- `multa_mora` - Multa e mora
- `desconto` - Desconto
- `valor_pago` - Valor efetivamente pago
- `fcartaobandeira`, `fcartaonumero` - Dados de cartão
- `fchequebanco`, `fchequenumero`, `fchequeagcc` - Dados de cheque
- `insnext` - Tratamento de juros
- `excluir_efipay` - Flag para EfiPay

**Campos no Model (Invoice.js):**
```javascript
{
  id,          // ✅ PRIMARY KEY
  uuid_lanc,   // ✅ UUID do lançamento
  datavenc,    // ✅ Data vencimento
  datapag,     // ✅ Data pagamento (usado)
  datadel,     // ✅ Data deleção
  valor,       // ✅ Valor (STRING)
  status,      // ✅ Status (usado)
  login,       // ✅ Login do cliente
  tipo,        // ✅ Tipo do título
  obs,         // ✅ Observações
  linhadig     // ✅ Linha digitável
}
```

**Resposta Atual:**
```javascript
{
  success: true,
  message: "Fatura paga com sucesso",
  invoice: {
    id: 130761,
    uuid_lanc: "...",
    login: "cliente_login",
    valor: "100.00",
    status: "pago",
    datavenc: "2025-12-01",
    datapag: "2025-12-07T15:36:00.000Z",
    tipo: "mensalidade",
    obs: "Pagamento via app"
  }
}
```

---

## 🛠️ Melhorias Recomendadas

### 1. Model SupportRequest (sis_suporte)

**Adicionar campos:**
```javascript
ramal: Sequelize.STRING,           // BRAS usado
uuid_suporte: Sequelize.STRING,    // UUID único do chamado
abertura: Sequelize.DATE,          // Data/hora abertura
```

### 2. Model Invoice (sis_lanc)

**Campos já existem no banco mas podem estar faltando:**
```javascript
formapag: Sequelize.STRING,        // Forma de pagamento
acrescimo: Sequelize.DECIMAL(10,2), // Acréscimo
multa_mora: Sequelize.DECIMAL(10,2), // Multa e mora
desconto: Sequelize.DECIMAL(10,2),   // Desconto
valor_pago: Sequelize.DECIMAL(10,2), // Valor efetivamente pago
cartao_bandeira: Sequelize.STRING,
cartao_numero: Sequelize.STRING,
cheque_banco: Sequelize.STRING,
cheque_numero: Sequelize.STRING,
cheque_agcc: Sequelize.STRING,
```

### 3. Endpoint POST /request (Abertura de Chamado)

**✅ Já Implementado Corretamente:**
- Aceita múltiplos formatos de ID do cliente
- Cria mensagem inicial automaticamente
- Gera número de chamado único
- Valida técnico e cliente
- Retorna dados completos

**📌 Sugestões de Melhoria:**
1. Adicionar campo `ramal` no model
2. Adicionar campo `uuid_suporte` no model
3. Gerar `uuid_suporte` automaticamente (UUID v4)
4. Salvar `abertura` como timestamp
5. Adicionar `login_atend` do funcionário que abriu

### 4. Endpoint POST /invoice/pay (Baixa de Fatura)

**⚠️ PRECISA SER EXPANDIDO**

**Implementação Recomendada:**
```javascript
async payInvoice(req, res) {
  const {
    invoice_id,
    titulo,
    uuid_lanc,
    data_pagamento,      // NOVO
    formapag,            // NOVO
    acrescimo,           // NOVO
    multa_mora,          // NOVO
    desconto,            // NOVO
    valor_pago,          // NOVO
    cartao_bandeira,     // NOVO
    cartao_numero,       // NOVO
    cheque_banco,        // NOVO
    cheque_numero,       // NOVO
    cheque_agcc,         // NOVO
    insnext,             // NOVO - tratamento de juros
    excluir_efipay,      // NOVO - flag EfiPay
  } = req.body;

  // Buscar fatura
  const invoice = await Invoice.findOne(...);

  // Calcular valor final
  const valorOriginal = parseFloat(invoice.valor);
  const valorAcrescimo = parseFloat(acrescimo || 0);
  const valorMultaMora = parseFloat(multa_mora || 0);
  const valorDesconto = parseFloat(desconto || 0);
  const valorFinal = valorOriginal + valorAcrescimo + valorMultaMora - valorDesconto;

  // Atualizar fatura
  invoice.status = 'pago';
  invoice.datapag = data_pagamento ? new Date(data_pagamento) : new Date();
  invoice.valor_pago = valor_pago || valorFinal;
  invoice.formapag = formapag || 'dinheiro';
  invoice.acrescimo = acrescimo || 0;
  invoice.multa_mora = multa_mora || 0;
  invoice.desconto = desconto || 0;
  
  // Se forma de pagamento for cartão
  if (formapag === 'cartao') {
    invoice.cartao_bandeira = cartao_bandeira;
    invoice.cartao_numero = cartao_numero;
  }
  
  // Se forma de pagamento for cheque
  if (formapag === 'cheque') {
    invoice.cheque_banco = cheque_banco;
    invoice.cheque_numero = cheque_numero;
    invoice.cheque_agcc = cheque_agcc;
  }

  await invoice.save();

  // Tratamento de juros para próxima mensalidade
  if (insnext === 'sim' && (multa_mora > 0 || acrescimo > 0)) {
    // Criar lançamento adicional na próxima mensalidade
    // ... implementar lógica
  }

  // Excluir título na EfiPay se solicitado
  if (excluir_efipay === 's') {
    // Chamar API EfiPay para cancelar
    // ... implementar integração
  }

  return res.json({ success: true, invoice });
}
```

---

## 📊 Tabela de Compatibilidade

| Campo | HTML Form | Model | Controller | Status |
|-------|-----------|-------|------------|--------|
| **CHAMADO (sis_suporte)** |
| cliente | ✅ | - | ✅ | Via lookup |
| uuid_cliente | ✅ | - | ✅ | Aceito |
| chamado | ✅ | ✅ | ✅ | Gerado |
| abertura | ✅ | ❌ | ⚠️ | Falta no model |
| atendente | ✅ | ✅ | ✅ | OK |
| tecnico | ✅ | ✅ | ✅ | OK |
| visita_data | ✅ | ✅ (visita) | ✅ | OK |
| visita_hora | ✅ | ✅ (visita) | ✅ | OK |
| prioridade | ✅ | ✅ | ✅ | OK |
| ramal | ✅ | ❌ | ⚠️ | Falta no model |
| assunto | ✅ | ✅ | ✅ | OK |
| msg | ✅ | - | ✅ | Via Mensagem |
| uuid_suporte | ✅ | ❌ | ❌ | Falta |
| **FATURA (sis_lanc)** |
| id/titulo | ✅ | ✅ | ✅ | OK |
| data_pagamento | ✅ | ✅ (datapag) | ⚠️ | Não aceita |
| formapag | ✅ | ❌ | ❌ | FALTA |
| acrescimo | ✅ | ❌ | ❌ | FALTA |
| multa_mora | ✅ | ❌ | ❌ | FALTA |
| desconto | ✅ | ❌ | ❌ | FALTA |
| valor_pago | ✅ | ❌ | ❌ | FALTA |
| cartao_* | ✅ | ❌ | ❌ | FALTA |
| cheque_* | ✅ | ❌ | ❌ | FALTA |
| insnext | ✅ | - | ❌ | FALTA lógica |
| excluir_efipay | ✅ | - | ❌ | FALTA integração |

---

## ✅ Conclusão

### Endpoint POST /request (Abertura de Chamado)
**Status:** ✅ BOM - 90% compatível

**Pontos Fortes:**
- Aceita múltiplos formatos de entrada
- Cria mensagem automaticamente
- Validações completas
- Resposta detalhada

**Melhorias Sugeridas:**
- Adicionar campo `ramal` no model
- Adicionar campo `uuid_suporte` no model
- Adicionar campo `abertura` no model

### Endpoint POST /invoice/pay (Baixa de Fatura)
**Status:** ⚠️ BÁSICO - 40% compatível

**Pontos Fortes:**
- Funcionalidade básica funciona
- Validações de fatura

**Melhorias NECESSÁRIAS:**
- Adicionar campos financeiros no model (formapag, acrescimo, multa_mora, desconto, valor_pago)
- Adicionar campos de pagamento (cartão, cheque)
- Implementar lógica de juros para próxima mensalidade
- Implementar integração com EfiPay
- Aceitar data_pagamento customizada
- Calcular valor final com acréscimos e descontos

---

## 🚀 Próximos Passos

1. **Criar migration** para adicionar campos faltantes em `sis_suporte` e `sis_lanc`
2. **Atualizar models** com os novos campos
3. **Expandir InvoiceController.payInvoice** com todos os campos do formulário
4. **Testar compatibilidade** com sistema legado
5. **Documentar** mudanças de API
