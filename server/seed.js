// Demo data for the School Management System.
//   - 6 faculty, 9 students, 18 courses (Computer Science, Computer Engineering, Entrepreneurship)
//   - class sections, enrollments with grades, tuition ledgers, and appointment tickets
//
// Run it AFTER schema.sql, from the server folder:   node seed.js
// Every account uses the password: password123 (development only)
import 'dotenv/config'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import { sslOption } from './db.js'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: sslOption })
const PASSWORD = process.env.SEED_PASSWORD || 'password123' // set SEED_PASSWORD before seeding a public site
const YEAR = new Date().getFullYear()

// Repeatable "random" numbers, so the demo data is the same every time you seed
let seedState = 20261008
const rand = () => {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296
  return seedState / 4294967296
}
const int = (min, max) => min + Math.floor(rand() * (max - min + 1))
const pick = (list) => list[Math.floor(rand() * list.length)]
const chance = (p) => rand() < p
const pad = (n, size = 4) => String(n).padStart(size, '0')
const addDays = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}
const isoDate = (d) => d.toLocaleDateString('en-CA') // YYYY-MM-DD

const PROGRAMS = ['Computer Science', 'Computer Engineering', 'Entrepreneurship']

// [course code, title, units]. The first digit of the code is the year level.
const COURSES = {
  'Computer Science': [
    ['CS101', 'Introduction to Computing', 3],
    ['CS102', 'Computer Programming 1', 3],
    ['CS201', 'Data Structures and Algorithms', 3],
    ['CS202', 'Object-Oriented Programming', 3],
    ['CS301', 'Database Management Systems', 3],
    ['CS302', 'Software Engineering', 3],
  ],
  'Computer Engineering': [
    ['CPE101', 'Introduction to Computer Engineering', 3],
    ['CPE102', 'Computer-Aided Drafting', 2],
    ['CPE201', 'Logic Circuits and Design', 3],
    ['CPE202', 'Electronics Fundamentals', 3],
    ['CPE301', 'Microprocessors and Embedded Systems', 4],
    ['CPE302', 'Computer Networks', 3],
  ],
  Entrepreneurship: [
    ['ENT101', 'Fundamentals of Entrepreneurship', 3],
    ['ENT102', 'Business Mathematics', 3],
    ['ENT201', 'Marketing Management', 3],
    ['ENT202', 'Financial Accounting', 3],
    ['ENT301', 'Business Plan Development', 3],
    ['ENT302', 'Operations and Supply Chain', 3],
  ],
}

const FACULTY = [
  { first: 'Fe', last: 'Faculty', email: 'faculty@sms.com', dept: 'Computer Science', title: 'Instructor' },
  { first: 'Ramon', last: 'Aguilar', dept: 'Computer Science', title: 'Associate Professor' },
  { first: 'Oscar', last: 'Medina', dept: 'Computer Engineering', title: 'Professor' },
  { first: 'Grace', last: 'Lorenzo', dept: 'Computer Engineering', title: 'Instructor' },
  { first: 'Dolores', last: 'Cabrera', dept: 'Entrepreneurship', title: 'Associate Professor' },
  { first: 'Victor', last: 'Ocampo', dept: 'Entrepreneurship', title: 'Instructor' },
]

const FIRST = [
  'Juan', 'Maria', 'Jose', 'Ana', 'Mark', 'Angel', 'John', 'Kim', 'Paolo', 'Bea', 'Carlo', 'Denise', 'Miguel',
  'Sofia', 'Gabriel', 'Isabel', 'Rafael', 'Camille', 'Nathan', 'Patricia', 'Luis', 'Trisha', 'Daniel', 'Katrina',
  'Joshua', 'Nicole', 'Andrei', 'Hannah', 'Kevin', 'Jasmine', 'Ethan', 'Alyssa', 'Jerome', 'Bianca', 'Christian',
  'Mikaela', 'Vince', 'Francesca', 'Adrian', 'Lara',
]
const LAST = [
  'Dela Cruz', 'Santos', 'Reyes', 'Garcia', 'Ramos', 'Mendoza', 'Bautista', 'Villanueva', 'Aquino', 'Castillo',
  'Flores', 'Torres', 'Navarro', 'Domingo', 'Pascual', 'Salazar', 'Fernandez', 'Lim', 'Tan', 'Cruz', 'Rivera',
  'Morales', 'Gonzales', 'Soriano', 'Valdez',
]

const DAYS = ['Mon/Wed', 'Tue/Thu', 'Mon/Wed/Fri', 'Fri', 'Sat']
const TIMES = [
  ['08:00', '09:30'], ['09:30', '11:00'], ['11:00', '12:30'],
  ['13:00', '14:30'], ['14:30', '16:00'], ['16:00', '17:30'],
]
const SLOTS = ['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM']
const GRADES = ['1.00', '1.25', '1.25', '1.50', '1.50', '1.75', '1.75', '2.00', '2.00', '2.25', '2.50', '2.75', '3.00', '5.00']
const BASE_TUITION = { 'Computer Science': 28000, 'Computer Engineering': 30000, Entrepreneurship: 24000 }

async function seed() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const hash = await bcrypt.hash(PASSWORD, 10) // same password for everyone, so hash once

    async function addUser(email, first, last, role, status = 'approved') {
      const r = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, status)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [email, hash, first, last, role, status]
      )
      return r.rows[0].id
    }

    // ---------- admin + staff ----------
    await addUser('admin@sms.com', 'Alex', 'Admin', 'admin')
    const registrarId = await addUser('registrar@sms.com', 'Rina', 'Registrar', 'staff')
    await client.query(
      `INSERT INTO staff_profiles (user_id, employee_id, department_type) VALUES ($1, $2, 'registrar')`,
      [registrarId, `EMP-${pad(registrarId, 3)}`]
    )
    const accountingId = await addUser('accounting@sms.com', 'Carlo', 'Accounting', 'staff')
    await client.query(
      `INSERT INTO staff_profiles (user_id, employee_id, department_type) VALUES ($1, $2, 'accounting')`,
      [accountingId, `EMP-${pad(accountingId, 3)}`]
    )

    // ---------- faculty ----------
    const facultyByProgram = {}
    for (const f of FACULTY) {
      const email = f.email || `${f.first}.${f.last}@faculty.sms.com`.toLowerCase()
      const id = await addUser(email, f.first, f.last, 'faculty')
      await client.query(
        `INSERT INTO faculty_profiles (user_id, faculty_id, department, title) VALUES ($1, $2, $3, $4)`,
        [id, `FAC-${pad(id, 3)}`, f.dept, f.title]
      )
      ;(facultyByProgram[f.dept] ||= []).push(id)
    }

    // ---------- courses + sections ----------
    const sections = []
    for (const program of PROGRAMS) {
      for (const [code, title, units] of COURSES[program]) {
        const course = await client.query(
          `INSERT INTO courses (course_code, title, units, program) VALUES ($1, $2, $3, $4) RETURNING course_id`,
          [code, title, units, program]
        )
        const level = Number(code.match(/\d/)[0])
        const sectionCount = level === 1 ? 2 : 1 // first-year courses get two sections
        const isLab = /Circuits|Embedded|Programming|Drafting|Networks/.test(title)
        for (let n = 0; n < sectionCount; n++) {
          const [start, end] = pick(TIMES)
          const capacity = isLab ? 30 : 40
          const sec = await client.query(
            `INSERT INTO class_sections
               (course_id, faculty_user_id, room_number, days_of_week, start_time, end_time, max_capacity)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING section_id`,
            [
              course.rows[0].course_id, pick(facultyByProgram[program]),
              isLab ? `Lab ${int(1, 4)}` : `Room ${int(1, 4)}0${int(1, 9)}`,
              pick(DAYS), start, end, capacity,
            ]
          )
          sections.push({ id: sec.rows[0].section_id, program, code, level, capacity, taken: 0 })
        }
      }
    }

    // ---------- students ----------
    const students = []
    async function addStudent({ email, first, last, program, year, status }) {
      const id = await addUser(email, first, last, 'student', status)
      await client.query(
        `INSERT INTO student_profiles (user_id, student_number, program, year_level) VALUES ($1, $2, $3, $4)`,
        [id, `${YEAR - (year - 1)}-${pad(id)}`, program, year]
      )
      const s = { id, program, year, status }
      students.push(s)
      return s
    }

    // Two fixed accounts for testing
    const juan = await addStudent({
      email: 'student@sms.com', first: 'Juan', last: 'Dela Cruz', program: 'Computer Science', year: 2, status: 'approved',
    })
    await addStudent({
      email: 'newstudent@sms.com', first: 'Maria', last: 'Santos', program: 'Entrepreneurship', year: 1, status: 'pending',
    })

    // 7 more students (9 in total: 8 approved, 1 waiting for approval)
    const usedNames = new Set(['Juan Dela Cruz', 'Maria Santos'])
    for (let i = 0; i < 7; i++) {
      const first = FIRST[(i + 2) % FIRST.length]
      let lastIndex = (i * 7 + 3) % LAST.length
      while (usedNames.has(`${first} ${LAST[lastIndex]}`)) lastIndex = (lastIndex + 1) % LAST.length
      const last = LAST[lastIndex]
      usedNames.add(`${first} ${last}`)

      const program = PROGRAMS[i % 3] // spreads students across the three programs
      const status = 'approved'
      await addStudent({
        email: `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, '') + '@student.sms.com',
        first, last, program, year: int(1, 4), status,
      })
    }

    // ---------- enrollments ----------
    const approvedStudents = students.filter((s) => s.status === 'approved')
    const insertEnrollment = (studentId, sectionId, status, grade) =>
      client.query(
        `INSERT INTO enrollments (student_id, section_id, status, grade) VALUES ($1, $2, $3, $4)`,
        [studentId, sectionId, status, grade]
      )

    for (const s of approvedStudents) {
      // Classes for their own program, up to their year level (year 4 takes 3xx courses)
      const eligible = sections.filter((sec) => sec.program === s.program && sec.level <= Math.min(s.year, 3))
      const oneSectionPerCourse = new Map()
      for (const sec of eligible) {
        if (!oneSectionPerCourse.has(sec.code) || chance(0.5)) oneSectionPerCourse.set(sec.code, sec)
      }
      const chosen = [...oneSectionPerCourse.values()]
        .sort(() => rand() - 0.5)
        .slice(0, s === juan ? 4 : int(3, 5))

      for (const sec of chosen) {
        let status = 'approved'
        const r = rand()
        if (r > 0.78 && r <= 0.9) status = 'pending'
        else if (r > 0.9 && r <= 0.95) status = 'denied'
        else if (r > 0.95) status = 'dropped'
        if (s === juan) status = 'approved'
        if (status === 'approved' && sec.taken >= sec.capacity) status = 'pending'

        let grade = null
        if (status === 'approved' && (sec.level < s.year || chance(0.5))) grade = pick(GRADES)
        if (s === juan) grade = sec.code === 'CS101' ? '1.50' : sec.code === 'CS102' ? '1.75' : null

        await insertEnrollment(s.id, sec.id, status, grade)
        if (status === 'approved') sec.taken++
      }
    }
    // Juan also has one request waiting for approval
    const cs301 = sections.find((sec) => sec.code === 'CS301')
    await insertEnrollment(juan.id, cs301.id, 'pending', null)

    // ---------- tuition ledgers ----------
    for (const s of approvedStudents) {
      const total = BASE_TUITION[s.program] + s.year * 500
      const r = rand()
      let paid = 0
      if (s === juan) paid = 10000
      else if (r < 0.3) paid = total
      else if (r < 0.7) paid = Math.round((total * (0.2 + rand() * 0.6)) / 500) * 500
      s.ledger = { total, paid }
      await client.query(
        `INSERT INTO tuition_ledgers (student_id, total_amount, amount_paid, payment_status) VALUES ($1, $2, $3, $4)`,
        [s.id, total, paid, paid <= 0 ? 'unpaid' : paid >= total ? 'paid' : 'partial']
      )
    }

    // ---------- appointment tickets ----------
    const usedRefs = new Set()
    const readyRefs = []
    function newReference() {
      let ref
      do ref = `REF-${YEAR}-${int(10000, 99999)}`
      while (usedRefs.has(ref))
      usedRefs.add(ref)
      return ref
    }
    async function addTicket(s, purpose, status, dayOffset, slot) {
      const due = purpose === 'accounting' ? Math.max(s.ledger.total - s.ledger.paid, 0) : 0
      const ref = newReference()
      await client.query(
        `INSERT INTO payment_tickets
           (student_id, reference_no, purpose, appointment_date, time_slot, amount_due, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [s.id, ref, purpose, isoDate(addDays(dayOffset)), slot, due, status, addDays(dayOffset - int(1, 3))]
      )
      if (status === 'ready') readyRefs.push(`${ref} (${purpose})`)
    }

    // Juan: one of each, good for the demo
    await addTicket(juan, 'accounting', 'ready', 1, '10:00 AM')
    await addTicket(juan, 'registration', 'pending', 3, '02:00 PM')
    await addTicket(juan, 'inquiry', 'completed', -5, '09:00 AM')

    for (const s of approvedStudents) {
      if (s === juan) continue
      const ticketCount = chance(0.45) ? 2 : 1
      for (let t = 0; t < ticketCount; t++) {
        const p = rand()
        const purpose = p < 0.5 ? 'accounting' : p < 0.85 ? 'registration' : 'inquiry'
        const q = rand()
        const status = q < 0.28 ? 'pending' : q < 0.6 ? 'ready' : q < 0.92 ? 'completed' : 'denied'
        const offset = status === 'pending' ? int(0, 7) : status === 'ready' ? int(0, 4) : -int(1, 14)
        await addTicket(s, purpose, status, offset, pick(SLOTS))
      }
    }

    await client.query('COMMIT')

    // ---------- summary ----------
    const count = async (table) => (await pool.query(`SELECT COUNT(*)::int AS n FROM ${table}`)).rows[0].n
    console.log('Seed complete.')
    console.log(`  users: ${await count('users')}  courses: ${await count('courses')}  sections: ${await count('class_sections')}`)
    console.log(`  enrollments: ${await count('enrollments')}  ledgers: ${await count('tuition_ledgers')}  tickets: ${await count('payment_tickets')}`)
    console.log(`All accounts use the password: ${PASSWORD}`)
    console.log('  admin@sms.com | registrar@sms.com | accounting@sms.com | faculty@sms.com | student@sms.com')
    console.log('Tickets ready to verify at the window, for testing:')
    readyRefs.slice(0, 4).forEach((r) => console.log('  ' + r))
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Seed failed:', err.message)
  } finally {
    client.release()
    await pool.end()
  }
}

seed()
