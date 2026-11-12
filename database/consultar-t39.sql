-- Execute sobre uma base de demonstração com o seed.
SELECT VERSION() AS mysql, DATABASE() AS banco;
SELECT COUNT(*) AS total_tabelas FROM information_schema.tables
WHERE table_schema=DATABASE() AND table_type='BASE TABLE';

-- ordinality é a posição impressa da questão a partir de 1.
SELECT v.label AS versao, j.posicao, q.statement AS questao,
       JSON_EXTRACT(v.printed_items, CONCAT('$[',j.posicao-1,'].alternative_order')) AS ordem_original,
       CHAR(65 + j.correta) AS gabarito_impresso
FROM exam_versions v
JOIN exams e ON e.id=v.exam_id
JOIN JSON_TABLE(v.printed_items, '$[*]' COLUMNS (
  posicao FOR ORDINALITY, questao BIGINT PATH '$.question_id', correta INT PATH '$.correct_index'
)) j ON TRUE
JOIN questions q ON q.id=j.questao
WHERE e.public_code='SEED-N2-2026'
ORDER BY v.label,j.posicao;

SELECT a.qr_code, v.label AS versao, u.ra, j.posicao,
       CHAR(65+r.marked_index) AS marcada,
       CHAR(65+CAST(JSON_UNQUOTE(JSON_EXTRACT(v.printed_items,
         CONCAT('$[',j.posicao-1,'].alternative_order[',r.marked_index,']'))) AS UNSIGNED)) AS original,
       CHAR(65+j.correta) AS gabarito, n.score AS nota, e.answer_key_released AS liberado
FROM exam_assignments a
JOIN users u ON u.id=a.student_id
JOIN exam_versions v ON v.id=a.version_id
JOIN exams e ON e.id=a.exam_id
JOIN results n ON n.exam_id=a.exam_id AND n.student_id=a.student_id
JOIN result_answers r ON r.exam_id=a.exam_id AND r.student_id=a.student_id
JOIN JSON_TABLE(v.printed_items, '$[*]' COLUMNS (
  posicao FOR ORDINALITY, questao BIGINT PATH '$.question_id', correta INT PATH '$.correct_index'
)) j ON j.questao=r.question_id
WHERE a.qr_code='T39-SEED-ALUNO-A'
ORDER BY j.posicao;
