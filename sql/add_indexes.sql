-- Índices recomendados para performance
-- Ajuste os nomes de tabelas conforme seu esquema real

-- Clientes
CREATE INDEX IF NOT EXISTS idx_sis_cliente_login ON sis_cliente (login);
CREATE INDEX IF NOT EXISTS idx_sis_cliente_cli_ativado ON sis_cliente (cli_ativado);
CREATE INDEX IF NOT EXISTS idx_sis_cliente_bloqueado ON sis_cliente (bloqueado);
CREATE INDEX IF NOT EXISTS idx_sis_cliente_cadastro ON sis_cliente (cadastro);

-- Faturas
CREATE INDEX IF NOT EXISTS idx_sis_boleto_login ON sis_boleto (login);
CREATE INDEX IF NOT EXISTS idx_sis_boleto_status ON sis_boleto (status);
CREATE INDEX IF NOT EXISTS idx_sis_boleto_datavenc ON sis_boleto (datavenc);

-- Chamados
CREATE INDEX IF NOT EXISTS idx_suporte_status ON suporte (status);
CREATE INDEX IF NOT EXISTS idx_suporte_prioridade ON suporte (prioridade);
