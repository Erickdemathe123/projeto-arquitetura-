-- Script de criação do banco do SGP
CREATE DATABASE IF NOT EXISTS sgp
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sgp;

-- Professor dono das turmas (a parte de login vai usar esta mesma tabela)
CREATE TABLE IF NOT EXISTS professores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Turmas do professor
CREATE TABLE IF NOT EXISTS turmas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  professor_id INT NOT NULL,
  nome VARCHAR(120) NOT NULL,
  descricao VARCHAR(255),
  codigo_convite CHAR(8) NOT NULL UNIQUE,
  arquivada BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_turma_professor FOREIGN KEY (professor_id) REFERENCES professores(id)
);

-- Alunos (identificados pelo RA, que é único)
CREATE TABLE IF NOT EXISTS alunos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  ra VARCHAR(30) NOT NULL UNIQUE,
  email VARCHAR(160),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Matrícula: liga aluno e turma (um aluno pode estar em várias turmas)
CREATE TABLE IF NOT EXISTS matriculas (
  turma_id INT NOT NULL,
  aluno_id INT NOT NULL,
  matriculado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (turma_id, aluno_id),
  CONSTRAINT fk_matricula_turma FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE CASCADE,
  CONSTRAINT fk_matricula_aluno FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE
);

-- =========================================================
-- Módulo de questões e avaliações: completa o restante do
-- diagrama de classes do SGP (docs/uml/diagrama-classes.puml).
-- =========================================================

-- Banco de questões do professor
CREATE TABLE IF NOT EXISTS questoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  professor_id INT NOT NULL,
  enunciado TEXT NOT NULL,
  disciplina VARCHAR(120) NOT NULL,
  assunto VARCHAR(120) NOT NULL,
  tipo VARCHAR(40) NOT NULL DEFAULT 'Múltipla escolha',
  -- Posição (0-based) da alternativa correta em questao_alternativas.ordem
  alternativa_correta TINYINT UNSIGNED NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_questao_professor FOREIGN KEY (professor_id) REFERENCES professores(id)
);

-- Alternativas de cada questão (2 a 10, conforme o limite da tela "Nova Questão")
CREATE TABLE IF NOT EXISTS questao_alternativas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  questao_id INT NOT NULL,
  ordem TINYINT UNSIGNED NOT NULL,
  texto VARCHAR(255) NOT NULL,
  CONSTRAINT fk_alternativa_questao FOREIGN KEY (questao_id) REFERENCES questoes(id) ON DELETE CASCADE,
  CONSTRAINT uq_alternativa_ordem UNIQUE (questao_id, ordem)
);

-- Avaliações (provas) montadas pelo professor para uma turma
CREATE TABLE IF NOT EXISTS avaliacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  professor_id INT NOT NULL,
  turma_id INT NOT NULL,
  nome VARCHAR(120) NOT NULL,
  instituicao VARCHAR(160),
  curso VARCHAR(120),
  disciplina VARCHAR(120),
  data_aplicacao DATE,
  instrucoes TEXT,
  logo_url VARCHAR(255),
  layout ENUM('Uma coluna', 'Duas colunas') NOT NULL DEFAULT 'Uma coluna',
  embaralhar_questoes BOOLEAN NOT NULL DEFAULT TRUE,
  embaralhar_alternativas BOOLEAN NOT NULL DEFAULT TRUE,
  numero_versoes TINYINT UNSIGNED NOT NULL DEFAULT 1,
  adicionar_pagina_branco BOOLEAN NOT NULL DEFAULT TRUE,
  codigo_publico VARCHAR(20) NOT NULL UNIQUE,
  gabarito_liberado BOOLEAN NOT NULL DEFAULT FALSE,
  status_correcao ENUM('pendente', 'em_andamento', 'concluida') NOT NULL DEFAULT 'pendente',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_avaliacao_professor FOREIGN KEY (professor_id) REFERENCES professores(id),
  CONSTRAINT fk_avaliacao_turma FOREIGN KEY (turma_id) REFERENCES turmas(id)
);

-- Questões que compõem cada avaliação (muitos-para-muitos, com ordem de impressão)
CREATE TABLE IF NOT EXISTS avaliacao_questoes (
  avaliacao_id INT NOT NULL,
  questao_id INT NOT NULL,
  ordem TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (avaliacao_id, questao_id),
  CONSTRAINT fk_av_questao_avaliacao FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE,
  CONSTRAINT fk_av_questao_questao FOREIGN KEY (questao_id) REFERENCES questoes(id)
);

-- Resultado da correção: nota de cada aluno em cada avaliação (tela "Corrigir Provas")
CREATE TABLE IF NOT EXISTS correcoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  avaliacao_id INT NOT NULL,
  aluno_id INT NOT NULL,
  nota DECIMAL(4,2) NOT NULL,
  corrigido_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_correcao_avaliacao FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE,
  CONSTRAINT fk_correcao_aluno FOREIGN KEY (aluno_id) REFERENCES alunos(id),
  CONSTRAINT uq_correcao_aluno_avaliacao UNIQUE (avaliacao_id, aluno_id)
);
