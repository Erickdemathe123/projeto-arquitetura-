-- Dados fictícios. Executar manualmente apenas em desenvolvimento/teste.
START TRANSACTION;
INSERT INTO users (name,email,password_hash,role,ra) VALUES
('Professor Teste A','professor.a@example.test','$2b$12$4v1wcESnqVO4wQYHQ1pJSuS32RsErJo0Et6yFKHBsl3xrCE.DAQ62','professor',NULL),
('Professor Teste B','professor.b@example.test','$2b$12$4v1wcESnqVO4wQYHQ1pJSuS32RsErJo0Et6yFKHBsl3xrCE.DAQ62','professor',NULL),
('Aluno Teste A','aluno.a@example.test',NULL,'aluno','SEED-2026-A'),
('Aluno Teste B','aluno.b@example.test',NULL,'aluno','SEED-2026-B')
ON DUPLICATE KEY UPDATE id = id;
SET @teacher_a = (SELECT id FROM users WHERE email='professor.a@example.test');
SET @teacher_b = (SELECT id FROM users WHERE email='professor.b@example.test');
SET @student_a = (SELECT id FROM users WHERE ra='SEED-2026-A');
SET @student_b = (SELECT id FROM users WHERE ra='SEED-2026-B');
INSERT INTO classes (name,invite_code,teacher_id) VALUES
('Turma de teste A','SEED26AA',@teacher_a), ('Turma de teste B','SEED26BB',@teacher_b)
ON DUPLICATE KEY UPDATE id = id;
SET @class_a = (SELECT id FROM classes WHERE invite_code='SEED26AA');
SET @class_b = (SELECT id FROM classes WHERE invite_code='SEED26BB');
INSERT INTO enrollments (class_id,student_id) VALUES (@class_a,@student_a),(@class_a,@student_b)
ON DUPLICATE KEY UPDATE id=id;
INSERT INTO questions (teacher_id,statement,subject,topic)
SELECT @teacher_a,'[SEED N2] Quanto é 2 + 2?','Matemática','Adição'
WHERE NOT EXISTS (SELECT 1 FROM questions WHERE teacher_id=@teacher_a AND statement='[SEED N2] Quanto é 2 + 2?');
SET @question_a = (SELECT id FROM questions WHERE teacher_id=@teacher_a AND statement='[SEED N2] Quanto é 2 + 2?' ORDER BY id LIMIT 1);
INSERT INTO questions (teacher_id,statement,subject,topic)
SELECT @teacher_b,'[SEED N2] Qual é a chave primária?','Banco de Dados','Chaves'
WHERE NOT EXISTS (SELECT 1 FROM questions WHERE teacher_id=@teacher_b AND statement='[SEED N2] Qual é a chave primária?');
SET @question_b = (SELECT id FROM questions WHERE teacher_id=@teacher_b AND statement='[SEED N2] Qual é a chave primária?' ORDER BY id LIMIT 1);
INSERT INTO alternatives (question_id,position,text,is_correct) VALUES
(@question_a,0,'3',FALSE),(@question_a,1,'4',TRUE),(@question_a,2,'5',FALSE),
(@question_b,0,'Identificador único',TRUE),(@question_b,1,'Um valor duplicado',FALSE)
ON DUPLICATE KEY UPDATE id=id;
INSERT INTO exams (teacher_id,title,status,public_code) VALUES (@teacher_a,'Avaliação teste N2','ready','SEED-N2-2026')
ON DUPLICATE KEY UPDATE id=id;
SET @exam = (SELECT id FROM exams WHERE public_code='SEED-N2-2026');
INSERT INTO exam_questions (exam_id,question_id,teacher_id,points,position) VALUES (@exam,@question_a,@teacher_a,1.00,0)
ON DUPLICATE KEY UPDATE id=id;
INSERT INTO applications (exam_id,class_id,teacher_id) VALUES (@exam,@class_a,@teacher_a)
ON DUPLICATE KEY UPDATE id=id;
-- Segunda questão do mesmo professor para demonstrar a inversão do caderno.
INSERT INTO questions (teacher_id,statement,subject,topic)
SELECT @teacher_a,'[T39] Quanto é 3 + 3?','Matemática','Adição'
WHERE NOT EXISTS (SELECT 1 FROM questions WHERE teacher_id=@teacher_a AND statement='[T39] Quanto é 3 + 3?');
SET @question_c = (SELECT MIN(id) FROM questions WHERE teacher_id=@teacher_a AND statement='[T39] Quanto é 3 + 3?');
INSERT INTO alternatives (question_id,position,text,is_correct) VALUES
(@question_c,0,'6',TRUE),(@question_c,1,'9',FALSE)
ON DUPLICATE KEY UPDATE id=id;
INSERT INTO exam_questions (exam_id,question_id,teacher_id,points,position)
VALUES (@exam,@question_c,@teacher_a,1.00,1) ON DUPLICATE KEY UPDATE id=id;
-- Na questão de 2 + 2, na origem a resposta certa é o índice 1 ("4"). Na versão B ela aparece como A.
INSERT INTO exam_versions (exam_id,label,printed_items) VALUES
(@exam,'A',JSON_ARRAY(
  JSON_OBJECT('question_id',CAST(@question_a AS UNSIGNED),'alternative_order',JSON_ARRAY(0,1,2),'correct_index',1),
  JSON_OBJECT('question_id',CAST(@question_c AS UNSIGNED),'alternative_order',JSON_ARRAY(0,1),'correct_index',0))),
(@exam,'B',JSON_ARRAY(
  JSON_OBJECT('question_id',CAST(@question_c AS UNSIGNED),'alternative_order',JSON_ARRAY(1,0),'correct_index',1),
  JSON_OBJECT('question_id',CAST(@question_a AS UNSIGNED),'alternative_order',JSON_ARRAY(1,2,0),'correct_index',0)))
ON DUPLICATE KEY UPDATE id=id;
SET @version_b = (SELECT id FROM exam_versions WHERE exam_id=@exam AND label='B');
INSERT INTO exam_assignments (exam_id,student_id,version_id,qr_code)
VALUES (@exam,@student_a,@version_b,'T39-SEED-ALUNO-A')
ON DUPLICATE KEY UPDATE qr_code=qr_code;
INSERT INTO results (exam_id,teacher_id,student_id,score) VALUES (@exam,@teacher_a,@student_a,10)
ON DUPLICATE KEY UPDATE id=id;
INSERT INTO result_answers (exam_id,student_id,question_id,marked_index)
VALUES (@exam,@student_a,@question_a,0),(@exam,@student_a,@question_c,1)
ON DUPLICATE KEY UPDATE marked_index=marked_index;
COMMIT;
