-- Modelo de Gabriel: User, Class, Enrollment, Question, Alternative,
-- Exam, ExamQuestion e Application. MySQL 8.4+.

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE,
  password_hash VARCHAR(255),
  role VARCHAR(9) NOT NULL,
  ra VARCHAR(30) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_user_role CHECK (role IN ('professor', 'aluno')),
  CONSTRAINT ck_professor_credentials CHECK (role <> 'professor' OR (email IS NOT NULL AND password_hash IS NOT NULL)),
  CONSTRAINT uq_user_role UNIQUE (id, role)
);

CREATE TABLE IF NOT EXISTS classes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  invite_code CHAR(8) NOT NULL UNIQUE,
  teacher_id BIGINT UNSIGNED NOT NULL,
  teacher_role VARCHAR(9) NOT NULL DEFAULT 'professor',
  description VARCHAR(255),
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT ck_class_teacher CHECK (teacher_role = 'professor'),
  CONSTRAINT fk_class_teacher FOREIGN KEY (teacher_id, teacher_role) REFERENCES users(id, role),
  CONSTRAINT uq_class_teacher UNIQUE (id, teacher_id)
);

CREATE TABLE IF NOT EXISTS enrollments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  class_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  student_role VARCHAR(9) NOT NULL DEFAULT 'aluno',
  enrolled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_enrollment_student CHECK (student_role = 'aluno'),
  CONSTRAINT uq_enrollment UNIQUE (class_id, student_id),
  CONSTRAINT fk_enrollment_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_enrollment_student FOREIGN KEY (student_id, student_role) REFERENCES users(id, role)
);

CREATE TABLE IF NOT EXISTS questions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  statement TEXT NOT NULL,
  teacher_id BIGINT UNSIGNED NOT NULL,
  teacher_role VARCHAR(9) NOT NULL DEFAULT 'professor',
  subject VARCHAR(120),
  topic VARCHAR(120),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT ck_question_teacher CHECK (teacher_role = 'professor'),
  CONSTRAINT fk_question_teacher FOREIGN KEY (teacher_id, teacher_role) REFERENCES users(id, role),
  CONSTRAINT uq_question_teacher UNIQUE (id, teacher_id),
  INDEX idx_question_teacher (teacher_id, id)
);

CREATE TABLE IF NOT EXISTS alternatives (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  question_id BIGINT UNSIGNED NOT NULL,
  text VARCHAR(255) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  position TINYINT UNSIGNED NOT NULL,
  -- Índice técnico garante no máximo uma correta; a API exige exatamente uma.
  correct_marker TINYINT GENERATED ALWAYS AS
    (CASE WHEN is_correct = 1 THEN 1 ELSE NULL END) STORED,
  CONSTRAINT ck_alternative_position CHECK (position BETWEEN 0 AND 4),
  CONSTRAINT ck_alternative_boolean CHECK (is_correct IN (0, 1)),
  CONSTRAINT uq_alternative_position UNIQUE (question_id, position),
  CONSTRAINT uq_alternative_correct UNIQUE (question_id, correct_marker),
  CONSTRAINT fk_alternative_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exams (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  status ENUM('draft','ready','closed') NOT NULL DEFAULT 'draft',
  teacher_id BIGINT UNSIGNED NOT NULL,
  teacher_role VARCHAR(9) NOT NULL DEFAULT 'professor',
  public_code VARCHAR(20) UNIQUE,
  answer_key_released BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT ck_exam_released CHECK (answer_key_released IN (0, 1)),
  legacy_details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_exam_teacher CHECK (teacher_role = 'professor'),
  CONSTRAINT fk_exam_teacher FOREIGN KEY (teacher_id, teacher_role) REFERENCES users(id, role),
  CONSTRAINT uq_exam_teacher UNIQUE (id, teacher_id)
);

CREATE TABLE IF NOT EXISTS exam_questions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  exam_id BIGINT UNSIGNED NOT NULL,
  question_id BIGINT UNSIGNED NOT NULL,
  teacher_id BIGINT UNSIGNED NOT NULL,
  points DECIMAL(6,2) NOT NULL DEFAULT 1.00,
  position INT UNSIGNED NOT NULL,
  CONSTRAINT ck_exam_question_points CHECK (points > 0),
  CONSTRAINT uq_exam_question UNIQUE (exam_id, question_id),
  CONSTRAINT uq_exam_question_position UNIQUE (exam_id, position),
  CONSTRAINT fk_exam_question_exam FOREIGN KEY (exam_id, teacher_id) REFERENCES exams(id, teacher_id) ON DELETE CASCADE,
  CONSTRAINT fk_exam_question_question FOREIGN KEY (question_id, teacher_id) REFERENCES questions(id, teacher_id)
);

CREATE TABLE IF NOT EXISTS applications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  exam_id BIGINT UNSIGNED NOT NULL,
  class_id BIGINT UNSIGNED NOT NULL,
  teacher_id BIGINT UNSIGNED NOT NULL,
  applied_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_application UNIQUE (exam_id, class_id),
  CONSTRAINT fk_application_exam FOREIGN KEY (exam_id, teacher_id) REFERENCES exams(id, teacher_id),
  CONSTRAINT fk_application_class FOREIGN KEY (class_id, teacher_id) REFERENCES classes(id, teacher_id)
);

-- Nota de cada aluno em cada avaliação, registrada na tela "Corrigir Provas" (T20).
CREATE TABLE IF NOT EXISTS results (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  exam_id BIGINT UNSIGNED NOT NULL,
  teacher_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  student_role VARCHAR(9) NOT NULL DEFAULT 'aluno',
  score DECIMAL(5,2) NOT NULL,
  corrected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_result_student CHECK (student_role = 'aluno'),
  CONSTRAINT ck_result_score CHECK (score BETWEEN 0 AND 10),
  CONSTRAINT uq_result_exam_student UNIQUE (exam_id, student_id),
  CONSTRAINT fk_result_exam FOREIGN KEY (exam_id, teacher_id) REFERENCES exams(id, teacher_id) ON DELETE CASCADE,
  CONSTRAINT fk_result_student FOREIGN KEY (student_id, student_role) REFERENCES users(id, role)
);

-- Uma linha por caderno. O array segue a ordem impressa das questões.
CREATE TABLE IF NOT EXISTS exam_versions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  exam_id BIGINT UNSIGNED NOT NULL,
  label VARCHAR(32) NOT NULL,
  printed_items JSON NOT NULL,
  CONSTRAINT uq_version_label UNIQUE (exam_id, label),
  CONSTRAINT uq_version_exam UNIQUE (exam_id, id),
  CONSTRAINT fk_version_exam FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  CONSTRAINT ck_version_items CHECK (JSON_SCHEMA_VALID(
    '{"type":"array","minItems":1,"maxItems":20,"items":{"type":"object","required":["question_id","alternative_order","correct_index"],"properties":{"question_id":{"type":"integer","minimum":1},"alternative_order":{"type":"array","minItems":2,"maxItems":5,"uniqueItems":true,"items":{"type":"integer","minimum":0,"maximum":4}},"correct_index":{"type":"integer","minimum":0,"maximum":4}}}}',
    printed_items
  ))
);

CREATE TABLE IF NOT EXISTS exam_assignments (
  exam_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  student_role VARCHAR(9) NOT NULL DEFAULT 'aluno',
  version_id BIGINT UNSIGNED NOT NULL,
  qr_code VARCHAR(96) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (exam_id, student_id),
  CONSTRAINT uq_assignment_qr UNIQUE (qr_code),
  CONSTRAINT ck_assignment_qr CHECK (CHAR_LENGTH(TRIM(qr_code)) > 0),
  CONSTRAINT ck_assignment_student CHECK (student_role = 'aluno'),
  CONSTRAINT fk_assignment_version FOREIGN KEY (exam_id, version_id)
    REFERENCES exam_versions(exam_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_assignment_student FOREIGN KEY (student_id, student_role) REFERENCES users(id, role)
);

CREATE TABLE IF NOT EXISTS result_answers (
  exam_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  question_id BIGINT UNSIGNED NOT NULL,
  marked_index TINYINT UNSIGNED,
  PRIMARY KEY (exam_id, student_id, question_id),
  CONSTRAINT ck_answer_index CHECK (marked_index BETWEEN 0 AND 4),
  CONSTRAINT fk_answer_result FOREIGN KEY (exam_id, student_id)
    REFERENCES results(exam_id, student_id) ON DELETE CASCADE,
  CONSTRAINT fk_answer_assignment FOREIGN KEY (exam_id, student_id)
    REFERENCES exam_assignments(exam_id, student_id),
  CONSTRAINT fk_answer_question FOREIGN KEY (exam_id, question_id)
    REFERENCES exam_questions(exam_id, question_id)
);
