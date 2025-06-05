-- Create Database
CREATE DATABASE IF NOT EXISTS sgi_saude;
USE sgi_saude;

-- Table for Hospital Units (Unidades Hospitalares)
CREATE TABLE IF NOT EXISTS unidades_hospitalares (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    endereco VARCHAR(255),
    telefone VARCHAR(20),
    email VARCHAR(255)
);

-- Table for Users (Estoquista, Gerente de Estoque)
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL, -- Hashed password
    tipo_usuario ENUM('estoquista', 'gerente_estoque') NOT NULL,
    unidade_id INT, -- Associate user with a specific hospital unit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (unidade_id) REFERENCES unidades_hospitalares(id)
);

use sgi_saude;
CREATE TABLE IF NOT EXISTS usuarios_teste (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL, -- Hashed password
    tipo_usuario ENUM('almoxarife_central', 'almoxarife_local', 'gestor', 'profissionais_saude') NOT NULL,
    unidade_id INT, -- Associate user with a specific hospital unit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (unidade_id) REFERENCES unidades_hospitalares(id)
);


-- Table for Insumos (Supplies)
CREATE TABLE IF NOT EXISTS insumos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    unidade_medida VARCHAR(50), -- E.g., "caixa", "unidade", "litro"
    local_armazenamento VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table for Batches (Lotes) - for traceability by batch and validity
CREATE TABLE IF NOT EXISTS lotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    insumo_id INT NOT NULL,
    numero_lote VARCHAR(255) NOT NULL,
    data_validade DATE NOT NULL,
    quantidade_inicial INT NOT NULL,
    quantidade_atual INT NOT NULL,
    status ENUM('ativo', 'vencido', 'bloqueado') DEFAULT 'ativo',
    unidade_id INT NOT NULL, -- Which unit currently holds this batch
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (insumo_id) REFERENCES insumos(id),
    FOREIGN KEY (unidade_id) REFERENCES unidades_hospitalares(id),
    UNIQUE (insumo_id, numero_lote, unidade_id) -- A batch number for a specific insumo should be unique within a unit
);

-- Table for Movements (Movimentacoes) - for entries and exits
CREATE TABLE IF NOT EXISTS movimentacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lote_id INT NOT NULL,
    tipo ENUM('entrada', 'saida', 'transferencia') NOT NULL,
    quantidade INT NOT NULL,
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    responsavel_id INT NOT NULL,
    unidade_origem_id INT NOT NULL,
    unidade_destino_id INT, -- For 'transferencia' type
    observacao TEXT,
    FOREIGN KEY (lote_id) REFERENCES lotes(id),
    FOREIGN KEY (responsavel_id) REFERENCES usuarios(id),
    FOREIGN KEY (unidade_origem_id) REFERENCES unidades_hospitalares(id),
    FOREIGN KEY (unidade_destino_id) REFERENCES unidades_hospitalares(id)
);

-- Table for Deliveries/Schedules (Agendamentos)
CREATE TABLE IF NOT EXISTS agendamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    unidade_origem_id INT NOT NULL,
    unidade_destino_id INT NOT NULL,
    data_agendamento DATETIME NOT NULL,
    status ENUM('pendente', 'em_transito', 'concluido', 'cancelado') DEFAULT 'pendente',
    observacao TEXT,
    responsavel_agendamento_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (unidade_origem_id) REFERENCES unidades_hospitalares(id),
    FOREIGN KEY (unidade_destino_id) REFERENCES unidades_hospitalares(id),
    FOREIGN KEY (responsavel_agendamento_id) REFERENCES usuarios(id)
);

-- Table for Items in an Agendamento (Itens do Agendamento)
CREATE TABLE IF NOT EXISTS agendamento_itens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agendamento_id INT NOT NULL,
    lote_id INT NOT NULL, -- Specific batch being delivered
    quantidade INT NOT NULL,
    FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE CASCADE,
    FOREIGN KEY (lote_id) REFERENCES lotes(id)
);

-- Table for Alerts (Alertas)
CREATE TABLE IF NOT EXISTS alertas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    unidade_id INT NOT NULL, -- Associated unit
    tipo ENUM('vencimento', 'estoque_critico', 'outros') NOT NULL,
    mensagem TEXT NOT NULL,
    data_alerta DATETIME DEFAULT CURRENT_TIMESTAMP,
    insumo_id INT, -- Optional: link to a specific insumo
    lote_id INT, -- Optional: link to a specific lote
    status ENUM('ativo', 'resolvido') DEFAULT 'ativo',
    FOREIGN KEY (unidade_id) REFERENCES unidades_hospitalares(id),
    FOREIGN KEY (insumo_id) REFERENCES insumos(id),
    FOREIGN KEY (lote_id) REFERENCES lotes(id)
);

-- Table for Auditing Logs
CREATE TABLE IF NOT EXISTS logs_auditoria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    acao VARCHAR(255) NOT NULL,
    entidade_afetada VARCHAR(255),
    entidade_id INT,
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    detalhes TEXT,
    ip_address VARCHAR(45),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- USE the database
USE sgi_saude;

-- Insert Hospital Units
INSERT INTO unidades_hospitalares (nome, endereco, telefone, email) VALUES ('Hospital Central FHEMIG', 'Rua Principal, 123, Centro', '31987654321', 'hospital.central@fhemig.gov.br');
INSERT INTO unidades_hospitalares (nome, endereco, telefone, email) VALUES ('UPA Leste FHEMIG', 'Av. Afonso Pena, 456, Boa Vista', '31998765432', 'upa.leste@fhemig.gov.br');
INSERT INTO unidades_hospitalares (nome, endereco, telefone, email) VALUES ('Hospital Metropolitano', 'Rua da Saúde, 789, Bairro Feliz', '3133334444', 'hospital.metro@example.com');
INSERT INTO unidades_hospitalares (nome, endereco, telefone, email) VALUES ('Pronto Socorro Oeste', 'Av. das Rosas, 10, Cidade Jardim', '3122221111', 'pronto.socorro@example.com');

-- Insert Users
INSERT INTO usuarios (nome, email, senha, tipo_usuario, unidade_id) VALUES ('Administrador Geral', 'admin@fhemig.gov.br', '$2b$10$6.zRaRcWWANpeqLLxu0i..7b/SjyDbw1O9/Rkub6X6Wk/LcJ3Z9ES', 'gerente_estoque', 1);
USE sgi_saude;
INSERT INTO usuarios_teste (nome, email, senha, tipo_usuario, unidade_id) VALUES ('Gestor', 'gestor@fhemig.gov.br', '$2b$10$J5O4tGS42BnqgBTtKEVrHuKS06B5p972eKAI0hLZtLCJdGSu9J8Vm', 'gestor', 1);
INSERT INTO usuarios_teste (nome, email, senha, tipo_usuario, unidade_id) VALUES ('Gestor', 'admin@fhemig.gov.br', '$2b$10$6.zRaRcWWANpeqLLxu0i..7b/SjyDbw1O9/Rkub6X6Wk/LcJ3Z9ES', 'gestor', 1);



-- Insert Insumos
INSERT INTO insumos (nome, descricao, unidade_medida, local_armazenamento) VALUES ('Máscara Cirúrgica', 'Máscara descartável de proteção facial', 'caixa', 'Almoxarifado Principal');

-- Insert Lotes (assuming insumo_id and unidade_id based on previous inserts)
-- Lote 1: Máscara Cirúrgica no Hospital Central
INSERT INTO lotes (insumo_id, numero_lote, data_validade, quantidade_inicial, quantidade_atual, status, unidade_id) VALUES (1, 'MASC202401-001', '2025-12-31', 500, 480, 'ativo', 1);
INSERT INTO lotes (insumo_id, numero_lote, data_validade, quantidade_inicial, quantidade_atual, status, unidade_id) VALUES (1, 'MASC202402-002', '2026-06-30', 300, 300, 'ativo', 1);

-- Lote 2: Luva de Procedimento (M) no Hospital Central
INSERT INTO lotes (insumo_id, numero_lote, data_validade, quantidade_inicial, quantidade_atual, status, unidade_id) VALUES (2, 'LUVA202401-001', '2025-10-15', 1000, 950, 'ativo', 1);

-- Lote 3: Soro Fisiológico na UPA Leste
INSERT INTO lotes (insumo_id, numero_lote, data_validade, quantidade_inicial, quantidade_atual, status, unidade_id) VALUES (3, 'SORO202403-001', '2025-05-20', 200, 180, 'ativo', 2);

-- Lote 4: Alcool 70% no Hospital Central (exemplo de vencido)
INSERT INTO lotes (insumo_id, numero_lote, data_validade, quantidade_inicial, quantidade_atual, status, unidade_id) VALUES (4, 'ALC202310-001', '2024-01-01', 50, 50, 'vencido', 1);

-- Lote 5: Máscara Cirúrgica no Hospital Metropolitano
INSERT INTO lotes (insumo_id, numero_lote, data_validade, quantidade_inicial, quantidade_atual, status, unidade_id) VALUES (1, 'MASC202403-003', '2026-12-31', 400, 400, 'ativo', 3);

-- Insert Movimentacoes (using existing lote_id, responsavel_id, unidade_origem_id, unidade_destino_id)
-- Movimentação de Saída (Máscara Cirúrgica - Hospital Central)
INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id, observacao) VALUES (1, 'saida', 20, 2, 1, 'Uso em pronto atendimento');

-- Movimentação de Entrada (Máscara Cirúrgica - Hospital Central)
INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id, observacao) VALUES (2, 'entrada', 300, 1, 1, 'Recebimento de novo lote do fornecedor X');

-- Movimentação de Saída (Soro Fisiológico - UPA Leste)
INSERT INTO movimentacoes (lote_id, tipo, quantidade, responsavel_id, unidade_origem_id, observacao) VALUES (3, 'saida', 10, 4, 2, 'Uso em emergência');


-- Insert Agendamentos (simulando uma transferência)
use sgi_saude;
INSERT INTO agendamentos (unidade_origem_id, unidade_destino_id, data_agendamento, status, observacao, responsavel_agendamento_id) VALUES (1, 3, '2025-06-05 10:00:00', 'pendente', 'Transferência de máscaras para suprir demanda do Hospital Metropolitano.', 1);
INSERT INTO agendamentos (unidade_origem_id, unidade_destino_id, data_agendamento, status, observacao, responsavel_agendamento_id) VALUES (2, 4, '2025-06-10 14:30:00', 'pendente', 'Envio de luvas para o Pronto Socorro Oeste.', 3);

-- Insert Agendamento_Itens (para o primeiro agendamento)
-- Lote 1 (Máscara Cirúrgica do Hospital Central)
INSERT INTO agendamento_itens (agendamento_id, lote_id, quantidade) VALUES (1, 1, 50);

-- Insert Agendamento_Itens (para o segundo agendamento)
-- Para este exemplo, estou usando o lote 3 (Soro Fisiológico) que está na UPA Leste (ID 2)
INSERT INTO agendamento_itens (agendamento_id, lote_id, quantidade) VALUES (2, 3, 30);


-- Insert Alertas
INSERT INTO alertas (unidade_id, tipo, mensagem, insumo_id, lote_id, status) VALUES (1, 'estoque_critico', 'Estoque de Máscara Cirúrgica (Lote MASC202401-001) está crítico. Quantidade atual: 20.', 1, 1, 'ativo');
INSERT INTO alertas (unidade_id, tipo, mensagem, insumo_id, lote_id, status) VALUES (2, 'vencimento', 'O Lote SORO202403-001 de Soro Fisiológico está próximo do vencimento.', 3, 3, 'ativo');
INSERT INTO alertas (unidade_id, tipo, mensagem, insumo_id, lote_id, status) VALUES (1, 'vencimento', 'O Lote ALC202310-001 de Álcool 70% está vencido e bloqueado para uso.', 4, 4, 'ativo');

-- Insert Logs de Auditoria
INSERT INTO logs_auditoria (usuario_id, acao, entidade_afetada, entidade_id, detalhes, ip_address) VALUES (1, 'LOGIN', 'usuarios', 1, 'Login bem-sucedido', '192.168.1.100');
INSERT INTO logs_auditoria (usuario_id, acao, entidade_afetada, entidade_id, detalhes, ip_address) VALUES (2, 'SAIDA_LOTE', 'lotes', 1, 'Retirada de 20 unidades de Máscara Cirúrgica (Lote MASC202401-001).', '192.168.1.101');
INSERT INTO logs_auditoria (usuario_id, acao, entidade_afetada, entidade_id, detalhes, ip_address) VALUES (1, 'CRIAR_UNIDADE', 'unidades_hospitalares', 3, 'Nova unidade Hospital Metropolitano criada.', '192.168.1.100');
INSERT INTO logs_auditoria (usuario_id, acao, entidade_afetada, entidade_id, detalhes, ip_address) VALUES (3, 'AGENDAMENTO_CRIADO', 'agendamentos', 2, 'Agendamento de transferência de insumos criado.', '192.168.1.102');

DROP DATABASE IF EXISTS sgi_saude;