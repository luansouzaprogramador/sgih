-- Criar Banco de Dados
CREATE DATABASE IF NOT EXISTS sgih;
USE sgih;

-- Tabela para Unidades Hospitalares
CREATE TABLE IF NOT EXISTS unidades_hospitalares (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    endereco VARCHAR(255),
    telefone VARCHAR(20),
    email VARCHAR(255)
);

-- Tabela para Usuários (Gestor, Almoxarifado Central, Almoxarifado Local, Profissionais da Saúde)
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL, -- Hashed password
    tipo_usuario ENUM('gestor', 'almoxarife_central', 'almoxarife_local', 'profissional_saude') NOT NULL,
    unidade_id INT, -- Associate user with a specific hospital unit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (unidade_id) REFERENCES unidades_hospitalares(id)
);

-- Tabela para Insumos
CREATE TABLE IF NOT EXISTS insumos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    unidade_medida VARCHAR(50), -- E.g., "caixa", "unidade", "litro"
    local_armazenamento VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela para Lotes (para rastreabilidade por lote e validade)
CREATE TABLE IF NOT EXISTS lotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    insumo_id INT NOT NULL,
    numero_lote VARCHAR(255) NOT NULL,
    data_validade DATE NOT NULL,
    quantidade_inicial INT NOT NULL,
    quantidade_atual INT NOT NULL,
    status ENUM('ativo', 'vencido', 'baixo') DEFAULT 'ativo',
    unidade_id INT NOT NULL, -- Which unit currently holds this batch
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (insumo_id) REFERENCES insumos(id),
    FOREIGN KEY (unidade_id) REFERENCES unidades_hospitalares(id),
    UNIQUE (insumo_id, numero_lote, unidade_id) -- A batch number for a specific insumo should be unique within a unit
);

-- Tabbela para Movimentacoes - para entradas, saídas e transferências
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

-- Tabela para Entregas/Agendamentos
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

-- Tabela para Itens do Agendamento
CREATE TABLE IF NOT EXISTS agendamento_itens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agendamento_id INT NOT NULL,
    lote_id INT NOT NULL, -- Specific batch being delivered
    quantidade INT NOT NULL,
    FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE CASCADE,
    FOREIGN KEY (lote_id) REFERENCES lotes(id)
);

-- Tabela para Alertas
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

CREATE TABLE IF NOT EXISTS solicitacoes_insumo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    insumo_id INT NOT NULL,
    quantidade INT NOT NULL,
    solicitante_id INT NOT NULL,
    status ENUM('pendente', 'aprovada', 'rejeitada', 'concluida') DEFAULT 'pendente',
    data_solicitacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (insumo_id) REFERENCES insumos(id),
    FOREIGN KEY (solicitante_id) REFERENCES usuarios(id)
);

-- Inserir Unidades Hospitalares
INSERT INTO unidades_hospitalares (nome, endereco, telefone, email) VALUES ('Hospital Central FHEMIG', 'Rua Principal, 123, Centro', '31987654321', 'hospital.central@fhemig.gov.br');
INSERT INTO unidades_hospitalares (nome, endereco, telefone, email) VALUES ('UPA Leste FHEMIG', 'Av. Afonso Pena, 456, Boa Vista', '31998765432', 'upa.leste@fhemig.gov.br');
INSERT INTO unidades_hospitalares (nome, endereco, telefone, email) VALUES ('Hospital Metropolitano', 'Rua da Saúde, 789, Bairro Feliz', '3133334444', 'hospital.metro@example.com');
INSERT INTO unidades_hospitalares (nome, endereco, telefone, email) VALUES ('Pronto Socorro Oeste', 'Av. das Rosas, 10, Cidade Jardim', '3122221111', 'pronto.socorro@example.com');

-- Inserir Usuários
INSERT INTO usuarios (nome, email, senha, tipo_usuario, unidade_id) VALUES ('Francisco', 'francisco@fhemig.gov.br', '$2b$10$JWxPWssoQyZgCw6HiTwcsOboQKrZxyRuApXs2p5ZW4B2K5dVpdV6S', 'almoxarife_central', 1);

INSERT INTO usuarios (nome, email, senha, tipo_usuario, unidade_id) VALUES ('Luan', 'luan@fhemig.gov.br', '$2b$10$7rhnAZkhWPiHK9O5EU5xWe1wYWPFjYTqU3gvcyA8GdTRTmjbgdvZS', 'gestor', 1);
INSERT INTO usuarios (nome, email, senha, tipo_usuario, unidade_id) VALUES ('Luana', 'luana@fhemig.gov.br', '$2b$10$QdhHNcgLTbXhaN8uKhqsterdNArfZfFQslbcxGPxa8/yMlfEYQ3vO', 'almoxarife_local', 1);
INSERT INTO usuarios (nome, email, senha, tipo_usuario, unidade_id) VALUES ('Marly', 'marly@fhemig.gov.br', '$2b$10$utsgmHt1y6EEHjyq9XTgSeoIRHp9kgJkPy5.USWZMkxQAPoOmimLS', 'profissional_saude', 1);

INSERT INTO usuarios (nome, email, senha, tipo_usuario, unidade_id) VALUES ('Gustavo', 'gustavo@fhemig.gov.br', '$2b$10$YqguZdt.go6N/FlzmaW0m.9v8TN7OJ8GVnx3wctk4VnNcrJ4DZB6G', 'gestor', 2);
INSERT INTO usuarios (nome, email, senha, tipo_usuario, unidade_id) VALUES ('Guilherme', 'guilherme@fhemig.gov.br', '$2b$10$OPZ/kaWHFa/DhVASF37PC.risjMeYgp1fE.FjLaCEAAaVb.n8I4Qy', 'almoxarife_local', 2);
INSERT INTO usuarios (nome, email, senha, tipo_usuario, unidade_id) VALUES ('Daniel', 'daniel@fhemig.gov.br', '$2b$10$AUWf6nhSxV/4o0CPFq98QOYhQSVZAaEAAB3BOwD8EVoeTMgI.Zk1K', 'profissional_saude', 2);

INSERT INTO usuarios (nome, email, senha, tipo_usuario, unidade_id) VALUES ('Isadellis', 'isadellis@fhemig.gov.br', '$2b$10$QaoAe6bUnP/S5agt3nuUgOIxLywZUq5ONnNiyxNNwLelUaW0easIm', 'gestor', 3);
INSERT INTO usuarios (nome, email, senha, tipo_usuario, unidade_id) VALUES ('Ana', 'ana@fhemig.gov.br', '$2b$10$LltX3pF5vsTv0phqqDuhseJaF8oXj9gMmDtaivvtORdlRTcQe9lyK', 'almoxarife_local', 3);
INSERT INTO usuarios (nome, email, senha, tipo_usuario, unidade_id) VALUES ('Isabelle', 'isabelle@fhemig.gov.br', '$2b$10$mwNTPSTrH9bP2uC2Q63GheCFQLZcRXU6NyBWffLVFBgxg5NT1uEVW', 'profissional_saude', 3);

INSERT INTO usuarios (nome, email, senha, tipo_usuario, unidade_id) VALUES ('Samuel', 'samuel@fhemig.gov.br', '$2b$10$vtjP8wkcFy6ir5Jr8tMANO3ZcExGKurKbo40Fu/IEh1/EVChW9dDO', 'gestor', 4);
INSERT INTO usuarios (nome, email, senha, tipo_usuario, unidade_id) VALUES ('João', 'joao@fhemig.gov.br', '$2b$10$HXEIyjGPOpk416sUXelCNu8MFC6dQxWxotetyCXMmwtqK9b7yH/oi', 'almoxarife_local', 4);
INSERT INTO usuarios (nome, email, senha, tipo_usuario, unidade_id) VALUES ('Henrique', 'henrique@fhemig.gov.br', '$2b$10$wXcvcSQ3DmpsyIFMy4AOoO3rMVyniPtgjGJFCNionRp6YoGF5q6n2', 'profissional_saude', 4);

-- Inserir Insumos
INSERT INTO insumos (nome, descricao, unidade_medida, local_armazenamento) VALUES ('Luvas de Procedimento', 'Luvas descartáveis de látex ou nitrilo', 'caixa', 'Armazenar em local seco e protegido da luz');
INSERT INTO insumos (nome, descricao, unidade_medida, local_armazenamento) VALUES ('Álcool 70%', 'Solução de álcool etílico a 70% para assepsia', 'litro', 'Manter em local ventilado e afastado de fontes de calor');
INSERT INTO insumos (nome, descricao, unidade_medida, local_armazenamento) VALUES ('Gaze Estéril', 'Compressas de gaze esterilizadas', 'pacote', 'Proteger da umidade e contaminação');
INSERT INTO insumos (nome, descricao, unidade_medida, local_armazenamento) VALUES ('Seringa Descartável', 'Seringa plástica para uso único', 'unidade', 'Armazenar em embalagem original, em local limpo');
INSERT INTO insumos (nome, descricao, unidade_medida, local_armazenamento) VALUES ('Agulha Descartável', 'Agulha hipodérmica para uso único', 'unidade', 'Manter em local seco e fresco, longe do alcance de crianças');
INSERT INTO insumos (nome, descricao, unidade_medida, local_armazenamento) VALUES ('Atadura de Crepe', 'Faixa elástica para imobilização e compressão', 'rolo', 'Guardar em local fresco e seco');
INSERT INTO insumos (nome, descricao, unidade_medida, local_armazenamento) VALUES ('Esparadrapo', 'Fita adesiva hipoalergênica', 'rolo', 'Conservar em local limpo e seco');
INSERT INTO insumos (nome, descricao, unidade_medida, local_armazenamento) VALUES ('Algodão Hidrófilo', 'Algodão para curativos e limpeza', 'pacote', 'Proteger da umidade');
INSERT INTO insumos (nome, descricao, unidade_medida, local_armazenamento) VALUES ('Sabonete Antisséptico', 'Sabonete líquido com agentes bactericidas', 'litro', 'Armazenar em temperatura ambiente');
INSERT INTO insumos (nome, descricao, unidade_medida, local_armazenamento) VALUES ('Lençol Descartável', 'Lençol de TNT para macas e leitos', 'pacote', 'Manter em local limpo e seco');
INSERT INTO insumos (nome, descricao, unidade_medida, local_armazenamento) VALUES ('Cânula Nasal', 'Dispositivo para administração de oxigênio', 'unidade', 'Armazenar em embalagem lacrada, em local protegido');
INSERT INTO insumos (nome, descricao, unidade_medida, local_armazenamento) VALUES ('Clorexidina Tópica', 'Solução antisséptica de clorexidina para uso externo', 'litro', 'Manter em local fresco e protegido da luz');
INSERT INTO insumos (nome, descricao, unidade_medida, local_armazenamento) VALUES ('Scalp Descartável', 'Dispositivo para acesso venoso periférico', 'unidade', 'Armazenar em embalagem estéril, em local limpo');
INSERT INTO insumos (nome, descricao, unidade_medida, local_armazenamento) VALUES ('Bandagem Elástica', 'Faixa elástica adesiva para compressão', 'rolo', 'Guardar em local seco e fresco');
INSERT INTO insumos (nome, descricao, unidade_medida, local_armazenamento) VALUES ('Termômetro Clínico', 'Termômetro digital para medição de temperatura corporal', 'unidade', 'Manter em local seco e protegido de impactos');
INSERT INTO insumos (nome, descricao, unidade_medida, local_armazenamento) VALUES ('Gorro Descartável', 'Gorro de TNT para proteção capilar', 'pacote', 'Proteger da umidade e sujeira');
INSERT INTO insumos (nome, descricao, unidade_medida, local_armazenamento) VALUES ('Propé Descartável', 'Protetor de calçados de TNT', 'pacote', 'Armazenar em local limpo e seco');
INSERT INTO insumos (nome, descricao, unidade_medida, local_armazenamento) VALUES ('Caixa de Descarte (Perfurocortantes)', 'Recipiente para descarte seguro de materiais perfurocortantes', 'unidade', 'Manter em local de fácil acesso, mas seguro');
INSERT INTO insumos (nome, descricao, unidade_medida, local_armazenamento) VALUES ('Compressa Cirúrgica', 'Compressa de algodão para procedimentos cirúrgicos', 'pacote', 'Armazenar em embalagem estéril e protegida da umidade');
INSERT INTO insumos (nome, descricao, unidade_medida, local_armazenamento) VALUES ('Água Destilada', 'Água purificada para diluição de medicamentos e soluções', 'litro', 'Manter em recipiente fechado, em local fresco');
