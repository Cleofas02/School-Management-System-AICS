import 'dotenv/config'
import pg from 'pg'

// Hosted databases (Neon, Supabase, Render ...) need SSL: set DATABASE_SSL=true there.
export const sslOption = process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined

// One shared connection pool used by all routes
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: sslOption })
