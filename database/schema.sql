-- Modelo de Gabriel: User, Class, Enrollment, Question, Alternative,
-- Exam, ExamQuestion e Application. MySQL 8.4+.
CREATE DATABASE IF NOT EXISTS sgp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sgp;

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
  correct_question_id BIGINT UNSIGNED GENERATED ALWAYS AS
    (CASE WHEN is_correct = 1 THEN question_id ELSE NULL END) STORED,
  CONSTRAINT ck_alternative_position CHECK (position BETWEEN 0 AND 4),
  CONSTRAINT ck_alternative_boolean CHECK (is_correct IN (0, 1)),
  CONSTRAINT uq_alternative_position UNIQUE (question_id, position),
  CONSTRAINT uq_alternative_correct UNIQUE (correct_question_id),
  CONSTRAINT fk_alternative_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exams (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  status ENUM('draft','ready','closed') NOT NULL DEFAULT 'draft',
  teacher_id BIGINT UNSIGNED NOT NULL,
  teacher_role VARCHAR(9) NOT NULL DEFAULT 'professor',
  public_code VARCHAR(20) UNIQUE,
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
