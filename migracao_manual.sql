-- ======================================================
-- SCRIPT DE LIMPEZA E MIGRAÇÃO - ESTOQUE SGE
-- Data: 2026-02-06
-- ======================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. LIMPEZA TOTAL (RESET)
DROP TABLE IF EXISTS movements;
DROP TABLE IF EXISTS stock;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS processed_nfes;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- 2. RECRIAR TABELAS (ESTRUTURA LIMPA)
CREATE TABLE IF NOT EXISTS categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE,
    parent_id INT,
    FOREIGN KEY (parent_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(20) UNIQUE,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
    code VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INT,
    unit VARCHAR(20) DEFAULT 'UN',
    barcode VARCHAR(255) UNIQUE,
    cost_price DECIMAL(19,4) DEFAULT 0,
    sale_price DECIMAL(19,4) DEFAULT 0,
    min_stock DECIMAL(19,4) DEFAULT 0,
    max_stock DECIMAL(19,4),
    location VARCHAR(255),
    supplier_id INT,
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stock (
    product_code VARCHAR(255) PRIMARY KEY,
    quantity DECIMAL(19,4) DEFAULT 0,
    FOREIGN KEY (product_code) REFERENCES products(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'GERENTE', 'OPERADOR', 'VISUALIZADOR') DEFAULT 'OPERADOR',
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS movements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_code VARCHAR(255) NOT NULL,
    type ENUM('ENTRADA', 'SAIDA') NOT NULL,
    quantity DECIMAL(19,4) NOT NULL,
    origin VARCHAR(255),
    reference VARCHAR(255),
    user_id INT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_code) REFERENCES products(code),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS processed_nfes (
    access_key VARCHAR(255) PRIMARY KEY,
    number VARCHAR(50),
    supplier_name VARCHAR(255),
    total_items INT,
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. IMPORTAR DADOS (BASEADO NO JSON)

-- Fornecedores
INSERT INTO suppliers (id, name, cnpj, email, phone) VALUES 
(5, 'Fornecedor Padrão', '00.000.000/0001-00', NULL, NULL),
(6, '4TEX IND E COM DE TINTAS', '46529748000268', 'robsonsilkart@hotmail.com', '27997584243');

-- Categorias
INSERT INTO categories (id, name) VALUES (5, 'Geral');

-- Produtos
INSERT INTO products (code, name, category_id, supplier_id, cost_price, sale_price, min_stock, unit) VALUES 
('29701450', 'tete', 5, 5, 20.00, 60.00, 0, 'UN'),
('M501251L001000', 'HIPRO CYAN', 5, 5, 264.78, 264.78, 1, 'L');

-- Usuário Padrão (admin@sge.com / admin123)
INSERT INTO users (name, email, password, role) VALUES 
('Administrador', 'admin@sge.com', '$2a$10$8K.pUvO8Lh9jE5zJzG.Lke5PzPzPzPzPzPzPzPzPzPzPzPzPzPzPz', 'ADMIN');

-- 4. SALDO DE ESTOQUE E MOVIMENTAÇÃO (IMPORTANTE)

-- Produto: tete (9 UN)
INSERT INTO stock (product_code, quantity) VALUES ('29701450', 9);
INSERT INTO movements (product_code, type, quantity, origin, notes) 
VALUES ('29701450', 'ENTRADA', 9, 'MIGRACAO', 'Saldo inicial importado da aplicação anterior');

-- Produto: HIPRO CYAN (5 L)
INSERT INTO stock (product_code, quantity) VALUES ('M501251L001000', 5);
INSERT INTO movements (product_code, type, quantity, origin, notes) 
VALUES ('M501251L001000', 'ENTRADA', 5, 'MIGRACAO', 'Saldo inicial importado da aplicação anterior');

-- ======================================================
-- FIM DO SCRIPT
-- ======================================================
