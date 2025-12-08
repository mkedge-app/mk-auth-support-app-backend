-- ============================================
-- MIGRATIONS BACKEND - Sistema de Mapas e CTOs
-- Data: 7 de dezembro de 2025
-- ============================================

-- MIGRATION 1: Adicionar coluna google_maps_api_key na tabela sis_provedor
-- Permite armazenar a API Key do Google Maps por provedor

ALTER TABLE sis_provedor 
ADD COLUMN google_maps_api_key VARCHAR(255) NULL;

-- Verificar se foi criada:
-- SHOW COLUMNS FROM sis_provedor LIKE 'google_maps_api_key';


-- MIGRATION 2: Criar índice composto para coordenadas de CTOs
-- Otimiza consultas de CTOs por latitude e longitude

CREATE INDEX idx_cto_lat_lng ON mp_caixa(latitude, longitude);

-- Verificar se foi criado:
-- SHOW INDEX FROM mp_caixa WHERE Key_name = 'idx_cto_lat_lng';


-- MIGRATION 3: Adicionar campos na tabela sis_suporte (Chamados)
-- Campos: ramal, uuid_suporte, abertura

ALTER TABLE sis_suporte
ADD COLUMN ramal VARCHAR(100) NULL,
ADD COLUMN uuid_suporte VARCHAR(36) NULL UNIQUE,
ADD COLUMN abertura DATETIME NULL;

-- Verificar:
-- SHOW COLUMNS FROM sis_suporte WHERE Field IN ('ramal', 'uuid_suporte', 'abertura');


-- MIGRATION 4: Adicionar campos financeiros na tabela sis_lanc (Faturas)
-- Campos para forma de pagamento, acréscimos, descontos, dados de cartão e cheque

ALTER TABLE sis_lanc
ADD COLUMN formapag VARCHAR(50) DEFAULT 'dinheiro',
ADD COLUMN acrescimo DECIMAL(10,2) DEFAULT 0,
ADD COLUMN multa_mora DECIMAL(10,2) DEFAULT 0,
ADD COLUMN desconto DECIMAL(10,2) DEFAULT 0,
ADD COLUMN valor_pago DECIMAL(10,2) NULL,
ADD COLUMN cartao_bandeira VARCHAR(50) NULL,
ADD COLUMN cartao_numero VARCHAR(20) NULL,
ADD COLUMN cheque_banco VARCHAR(100) NULL,
ADD COLUMN cheque_numero VARCHAR(100) NULL,
ADD COLUMN cheque_agcc VARCHAR(100) NULL;

-- Verificar:
-- SHOW COLUMNS FROM sis_lanc WHERE Field IN ('formapag', 'acrescimo', 'multa_mora', 'desconto', 'valor_pago');


-- ============================================
-- CONFIGURAÇÃO (OPCIONAL)
-- ============================================

-- Inserir/Atualizar API Key do Google Maps na tabela sis_opcao
-- (Usado como fallback se não houver no tenant)

INSERT INTO sis_opcao (nome, valor) 
VALUES ('key_googlemaps', 'SUA_API_KEY_AQUI')
ON DUPLICATE KEY UPDATE valor = 'SUA_API_KEY_AQUI';


-- ============================================
-- ROLLBACK (Se necessário)
-- ============================================

-- Reverter Migration 1:
-- ALTER TABLE sis_provedor DROP COLUMN google_maps_api_key;

-- Reverter Migration 2:
-- DROP INDEX idx_cto_lat_lng ON mp_caixa;

-- Reverter Migration 3:
-- ALTER TABLE sis_suporte 
-- DROP COLUMN ramal,
-- DROP COLUMN uuid_suporte,
-- DROP COLUMN abertura;

-- Reverter Migration 4:
-- ALTER TABLE sis_lanc
-- DROP COLUMN formapag,
-- DROP COLUMN acrescimo,
-- DROP COLUMN multa_mora,
-- DROP COLUMN desconto,
-- DROP COLUMN valor_pago,
-- DROP COLUMN cartao_bandeira,
-- DROP COLUMN cartao_numero,
-- DROP COLUMN cheque_banco,
-- DROP COLUMN cheque_numero,
-- DROP COLUMN cheque_agcc;

-- Remover configuração da API Key:
-- DELETE FROM sis_opcao WHERE nome = 'key_googlemaps';
