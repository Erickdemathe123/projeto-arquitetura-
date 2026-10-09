-- Script de criação do banco do SGP (módulo de turmas)
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
