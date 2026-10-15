-- DADOS FICTÍCIOS: somente desenvolvimento/testes. Nunca carregar na produção.
USE sgp;
START TRANSACTION;
INSERT INTO professores (nome, email, senha_hash) VALUES
('Professor Teste A', 'professor.a@example.test', '$2b$12$4v1wcESnqVO4wQYHQ1pJSuS32RsErJo0Et6yFKHBsl3xrCE.DAQ62'),
('Professor Teste B', 'professor.b@example.test', '$2b$12$4v1wcESnqVO4wQYHQ1pJSuS32RsErJo0Et6yFKHBsl3xrCE.DAQ62')
ON DUPLICATE KEY UPDATE id = id;
SET @professor_a = (SELECT id FROM professores WHERE email = 'professor.a@example.test');
SET @professor_b = (SELECT id FROM professores WHERE email = 'professor.b@example.test');
INSERT INTO alunos (nome, ra, email) VALUES
('Aluno Teste A', 'SEED-2026-A', 'aluno.a@example.test'),
('Aluno Teste B', 'SEED-2026-B', 'aluno.b@example.test')
ON DUPLICATE KEY UPDATE id = id;
SET @aluno_a = (SELECT id FROM alunos WHERE ra = 'SEED-2026-A');
SET @aluno_b = (SELECT id FROM alunos WHERE ra = 'SEED-2026-B');
INSERT INTO turmas (professor_id, nome, descricao, codigo_convite) VALUES
(@professor_a, 'Turma de teste A', 'Fixture N2', 'SEED26AA'),
(@professor_b, 'Turma de teste B', 'Fixture N2', 'SEED26BB')
ON DUPLICATE KEY UPDATE id = id;
SET @turma_a = (SELECT id FROM turmas WHERE codigo_convite = 'SEED26AA');
INSERT INTO matriculas (turma_id, aluno_id) VALUES (@turma_a, @aluno_a), (@turma_a, @aluno_b)
ON DUPLICATE KEY UPDATE aluno_id = aluno_id;
INSERT INTO questoes (professor_id, enunciado, disciplina, assunto, alternativa_correta)
SELECT @professor_a, '[SEED N2] Quanto é 2 + 2?', 'Matemática', 'Adição', 1
WHERE NOT EXISTS (SELECT 1 FROM questoes WHERE professor_id = @professor_a AND enunciado = '[SEED N2] Quanto é 2 + 2?');
SET @questao_a = (SELECT id FROM questoes WHERE professor_id = @professor_a AND enunciado = '[SEED N2] Quanto é 2 + 2?' ORDER BY id LIMIT 1);
INSERT INTO questoes (professor_id, enunciado, disciplina, assunto, alternativa_correta)
SELECT @professor_b, '[SEED N2] Qual é a chave primária?', 'Banco de Dados', 'Chaves', 0
WHERE NOT EXISTS (SELECT 1 FROM questoes WHERE professor_id = @professor_b AND enunciado = '[SEED N2] Qual é a chave primária?');
SET @questao_b = (SELECT id FROM questoes WHERE professor_id = @professor_b AND enunciado = '[SEED N2] Qual é a chave primária?' ORDER BY id LIMIT 1);
INSERT INTO questao_alternativas (questao_id, ordem, texto) VALUES
(@questao_a, 0, '3'), (@questao_a, 1, '4'), (@questao_a, 2, '5'),
(@questao_b, 0, 'Identificador único'), (@questao_b, 1, 'Um valor duplicado')
ON DUPLICATE KEY UPDATE id = id;
INSERT INTO avaliacoes (professor_id, turma_id, nome, codigo_publico, status)
VALUES (@professor_a, @turma_a, 'Avaliação de teste N2', 'SEED-N2-2026', 'ready')
ON DUPLICATE KEY UPDATE id = id;
SET @avaliacao = (SELECT id FROM avaliacoes WHERE codigo_publico = 'SEED-N2-2026');
INSERT INTO avaliacao_questoes (avaliacao_id, questao_id, ordem, pontuacao)
VALUES (@avaliacao, @questao_a, 0, 1.00)
ON DUPLICATE KEY UPDATE questao_id = questao_id;
INSERT INTO aplicacoes (avaliacao_id, turma_id, professor_id)
VALUES (@avaliacao, @turma_a, @professor_a)
ON DUPLICATE KEY UPDATE id = id;
COMMIT;
