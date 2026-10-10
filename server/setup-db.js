// Creates all tables from database/schema.sql (WARNING: wipes existing tables).
//   npm run db:schema
import 'dotenv/config'
import fs from 'node:fs'
import pg from 'pg'
import { sslOption } from './db.js'

const sql = fs.readFileSync(new URL('../database/schema.sql', import.meta.url), 'utf-8')
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: sslOption })
await pool.query(sql)
console.log('Schema created.')
await pool.end()
