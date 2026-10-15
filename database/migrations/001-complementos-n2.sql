-- Para bancos criados pelo schema anterior à T07. Executar UMA vez.
-- Faça backup e consulte database/README.md antes de executar.
USE sgp;
ALTER TABLE alunos ADD COLUMN senha_hash VARCHAR(255),
  ADD CONSTRAINT uq_aluno_email UNIQUE (email);
ALTER TABLE turmas ADD CONSTRAINT uq_turma_professor UNIQUE (id, professor_id);
ALTER TABLE questoes
  ADD CONSTRAINT ck_questao_correta CHECK (alternativa_correta BETWEEN 0 AND 4),
  ADD INDEX idx_questoes_professor_id (professor_id, id);
ALTER TABLE questao_alternativas
  ADD CONSTRAINT ck_alternativa_ordem CHECK (ordem BETWEEN 0 AND 4);
ALTER TABLE avaliacoes
  ADD COLUMN status ENUM('draft', 'ready', 'closed') NOT NULL DEFAULT 'draft',
  ADD CONSTRAINT uq_avaliacao_professor UNIQUE (id, professor_id);
ALTER TABLE avaliacao_questoes
  ADD COLUMN pontuacao DECIMAL(6,2) NOT NULL DEFAULT 1.00,
  ADD CONSTRAINT ck_avaliacao_pontuacao CHECK (pontuacao > 0),
  ADD CONSTRAINT uq_avaliacao_ordem UNIQUE (avaliacao_id, ordem);

-- Aplicação permite reutilizar uma avaliação em turmas do mesmo professor.
CREATE TABLE IF NOT EXISTS aplicacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  avaliacao_id INT NOT NULL,
  turma_id INT NOT NULL,
  professor_id INT NOT NULL,
  data_aplicacao DATETIME,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_aplicacao_avaliacao_turma UNIQUE (avaliacao_id, turma_id),
  CONSTRAINT fk_aplicacao_avaliacao FOREIGN KEY (avaliacao_id, professor_id)
    REFERENCES avaliacoes(id, professor_id),
  CONSTRAINT fk_aplicacao_turma FOREIGN KEY (turma_id, professor_id)
    REFERENCES turmas(id, professor_id)
);
