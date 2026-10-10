-- School Management System - Phase 1 schema
-- WARNING: running this file wipes and recreates all tables (fine for development).

DROP TABLE IF EXISTS tuition_ledgers CASCADE;
DROP TABLE IF EXISTS payment_tickets CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS class_sections CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS faculty_profiles CASCADE;
DROP TABLE IF EXISTS staff_profiles CASCADE;
DROP TABLE IF EXISTS student_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS: everyone who can log in
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'faculty', 'student')),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PROFILES: extra details per role (1:1 with users)
CREATE TABLE student_profiles (
  user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  student_number  TEXT NOT NULL UNIQUE,
  program         TEXT NOT NULL CHECK (program IN ('Computer Science', 'Computer Engineering', 'Entrepreneurship')),
  year_level      INTEGER NOT NULL DEFAULT 1,
  academic_status TEXT NOT NULL DEFAULT 'regular'
);

CREATE TABLE staff_profiles (
  user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  employee_id     TEXT NOT NULL UNIQUE,
  department_type TEXT NOT NULL CHECK (department_type IN ('registrar', 'accounting'))
);

CREATE TABLE faculty_profiles (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  faculty_id TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,
  title      TEXT
);

-- 3. COURSES and CLASS SECTIONS (Registrar + Teaching)
CREATE TABLE courses (
  course_id   SERIAL PRIMARY KEY,
  course_code TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  units       INTEGER NOT NULL DEFAULT 3,
  program     TEXT NOT NULL CHECK (program IN ('Computer Science', 'Computer Engineering', 'Entrepreneurship'))
);

CREATE TABLE class_sections (
  section_id      SERIAL PRIMARY KEY,
  course_id       INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  faculty_user_id INTEGER REFERENCES faculty_profiles(user_id) ON DELETE SET NULL,
  room_number     TEXT,
  days_of_week    TEXT,
  start_time      TIME,
  end_time        TIME,
  max_capacity    INTEGER NOT NULL DEFAULT 40
);

-- 4. ENROLLMENTS: a student joins a section (admin/registrar approves)
CREATE TABLE enrollments (
  enrollment_id SERIAL PRIMARY KEY,
  student_id    INTEGER NOT NULL REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  section_id    INTEGER NOT NULL REFERENCES class_sections(section_id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'dropped')),
  grade         TEXT,
  UNIQUE (student_id, section_id)
);

-- 5. PAYMENT TICKETS: appointment booking + reference number
CREATE TABLE payment_tickets (
  ticket_id        SERIAL PRIMARY KEY,
  student_id       INTEGER NOT NULL REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  reference_no     TEXT NOT NULL UNIQUE,
  purpose          TEXT NOT NULL CHECK (purpose IN ('accounting', 'registration', 'inquiry')),
  appointment_date DATE NOT NULL,
  time_slot        TEXT NOT NULL,
  amount_due       NUMERIC(10,2) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'completed', 'denied')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TUITION LEDGER: one running balance per student (Accounting)
CREATE TABLE tuition_ledgers (
  ledger_id      SERIAL PRIMARY KEY,
  student_id     INTEGER NOT NULL UNIQUE REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  total_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_paid    NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid'))
);
