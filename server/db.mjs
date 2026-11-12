import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto"
import { promisify } from "node:util"
import pg from "pg"

const { Pool } = pg
const scrypt = promisify(scryptCallback)
const passwordLength = 64

const hashPassword = async (password) => {
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, passwordLength)
  return { salt: salt.toString("hex"), hash: hash.toString("hex") }
}

const dummyCredentials = await hashPassword(randomBytes(32).toString("hex"))

const verifyPassword = async (password, saltHex, hashHex) => {
  const expected = Buffer.from(hashHex, "hex")
  const actual = await scrypt(
    password,
    Buffer.from(saltHex, "hex"),
    expected.length,
  )
  return timingSafeEqual(actual, expected)
}

const hashToken = (token) => createHash("sha256").update(token).digest("hex")

const schema = `
  CREATE TABLE IF NOT EXISTS equipment (
    id text PRIMARY KEY,
    position integer NOT NULL,
    data jsonb NOT NULL
  );
  CREATE TABLE IF NOT EXISTS alerts (
    id text PRIMARY KEY,
    position integer NOT NULL,
    data jsonb NOT NULL
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id text PRIMARY KEY,
    position integer NOT NULL,
    data jsonb NOT NULL
  );
  CREATE TABLE IF NOT EXISTS support_team (
    id text PRIMARY KEY,
    position integer NOT NULL,
    data jsonb NOT NULL
  );
  CREATE TABLE IF NOT EXISTS dashboard_settings (
    key text PRIMARY KEY,
    data jsonb NOT NULL
  );
  CREATE TABLE IF NOT EXISTS support_requests (
    ticket_id text PRIMARY KEY,
    team text NOT NULL,
    message text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS app_users (
    id uuid PRIMARY KEY,
    email text NOT NULL UNIQUE,
    name text NOT NULL,
    company text NOT NULL,
    role text NOT NULL CHECK (role IN ('admin', 'manager', 'fixer', 'renter')),
    password_salt text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS app_sessions (
    token_hash text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL
  );
  CREATE TABLE IF NOT EXISTS telemetry_readings (
    id bigserial PRIMARY KEY,
    equipment_id text NOT NULL,
    recorded_at timestamptz NOT NULL,
    temperature real,
    vibration real,
    rpm real,
    pressure real,
    source text NOT NULL
  );
  CREATE INDEX IF NOT EXISTS telemetry_readings_equipment_time
    ON telemetry_readings (equipment_id, recorded_at DESC);
  CREATE TABLE IF NOT EXISTS bookings (
    id uuid PRIMARY KEY,
    equipment_id text NOT NULL REFERENCES equipment(id),
    user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
    tenant text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    note text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (end_date >= start_date)
  );
  CREATE INDEX IF NOT EXISTS bookings_equipment_dates
    ON bookings (equipment_id, start_date, end_date) WHERE status = 'confirmed';
`

// Жишээ захиалгууд (өнөөдрөөс хойш хэдэн хоног). Хүснэгт хоосон үед л үүснэ.
const demoBookings = [
  ["DRL-UB-0247", "Хөх Тэнгэр ХХК", 2, 5],
  ["DRL-UB-0247", "Говь зам ХХК", 12, 14],
  ["GEN-0162", "Монкон ХХК", 1, 3],
  ["MIX-4993", "Улаанбаатар бетон", 6, 9],
  ["EXC-0914", "Говь зам ХХК", 4, 8],
]

const bookingColumns = `id, equipment_id, user_id, tenant, note, status, created_at,
  to_char(start_date, 'YYYY-MM-DD') AS start_date,
  to_char(end_date, 'YYYY-MM-DD') AS end_date`

const toBooking = (row, viewerId) => ({
  id: row.id,
  equipmentId: row.equipment_id,
  startDate: row.start_date,
  endDate: row.end_date,
  mine: Boolean(viewerId) && row.user_id === viewerId,
  tenant: row.tenant,
  note: row.note,
  status: row.status,
  createdAt: row.created_at.toISOString(),
})

const seedRows = async (client, table, rows) => {
  for (const [position, row] of rows.entries()) {
    await client.query(
      `INSERT INTO ${table} (id, position, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [row.id, position, row],
    )
  }
}

const readRows = async (pool, table) => {
  const { rows } = await pool.query(
    `SELECT data FROM ${table} ORDER BY position`,
  )
  return rows.map(({ data }) => data)
}

const normalizeEmail = (email) => email.trim().toLowerCase()

const publicUser = ({ id, email, name, company, role }) => ({
  id,
  email,
  name,
  company,
  role,
  phone: "",
})

const createSession = async (pool, user) => {
  const token = randomBytes(32).toString("base64url")
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
  await pool.query(
    "INSERT INTO app_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
    [hashToken(token), user.id, expiresAt],
  )
  return {
    token,
    role: user.role,
    expiresAt: expiresAt.toISOString(),
  }
}

export const createDatabaseStore = async ({
  dashboard,
  equipment,
  alerts,
  notifications,
  supportTeam,
}) => {
  if (!process.env.DATABASE_URL) return null

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  let client
  let transactionStarted = false

  try {
    client = await pool.connect()
    await client.query("SELECT 1")
    await client.query(schema)
    await client.query("BEGIN")
    transactionStarted = true
    await seedRows(client, "equipment", equipment)
    await seedRows(client, "alerts", alerts)
    await seedRows(client, "notifications", notifications)
    await seedRows(
      client,
      "support_team",
      supportTeam.map((member, index) => ({
        id: `support-${index + 1}`,
        ...member,
      })),
    )
    await client.query(
      "INSERT INTO dashboard_settings (key, data) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING",
      ["summary", dashboard.summary],
    )
    const { rows: bookingCount } = await client.query(
      "SELECT count(*)::int AS n FROM bookings",
    )
    if (bookingCount[0].n === 0) {
      for (const [equipmentId, tenant, from, to] of demoBookings) {
        await client.query(
          "INSERT INTO bookings (id, equipment_id, tenant, start_date, end_date) VALUES ($1, $2, $3, current_date + $4::int, current_date + $5::int)",
          [randomUUID(), equipmentId, tenant, from, to],
        )
      }
    }
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
    const adminPassword = process.env.ADMIN_PASSWORD
    if (Boolean(adminEmail) !== Boolean(adminPassword)) {
      throw new Error(
        "Set both ADMIN_EMAIL and ADMIN_PASSWORD to bootstrap an admin.",
      )
    }
    if (adminEmail && adminPassword) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
        throw new Error("ADMIN_EMAIL must be a valid email address.")
      }
      if (adminPassword.length < 12) {
        throw new Error("ADMIN_PASSWORD must contain at least 12 characters.")
      }

      const { rows: existingAdmin } = await client.query(
        "SELECT id, role FROM app_users WHERE email = $1",
        [adminEmail],
      )
      if (existingAdmin[0] && existingAdmin[0].role !== "admin") {
        throw new Error("ADMIN_EMAIL belongs to a non-admin account.")
      }
      if (!existingAdmin[0]) {
        const credentials = await hashPassword(adminPassword)
        await client.query(
          "INSERT INTO app_users (id, email, name, company, role, password_salt, password_hash) VALUES ($1, $2, $3, $4, 'admin', $5, $6)",
          [
            randomUUID(),
            adminEmail,
            "Administrator",
            "Equipment Rental",
            credentials.salt,
            credentials.hash,
          ],
        )
      }
    }
    await client.query("COMMIT")
    transactionStarted = false
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK")
      } catch (rollbackError) {
        console.error(
          "Failed to roll back PostgreSQL initialization:",
          rollbackError,
        )
      }
    }
    client?.release()
    client = undefined
    await pool.end()
    throw new Error("Could not connect to or initialize PostgreSQL.", {
      cause: error,
    })
  } finally {
    client?.release()
  }

  return {
    healthCheck: async () => {
      await pool.query("SELECT 1")
    },
    getDashboard: async () => {
      const { rows } = await pool.query(
        "SELECT data FROM dashboard_settings WHERE key = $1",
        ["summary"],
      )
      if (!rows[0])
        throw new Error("Dashboard summary is missing from PostgreSQL.")

      const [equipmentRows, alertRows, notificationRows, teamRows] =
        await Promise.all([
          readRows(pool, "equipment"),
          readRows(pool, "alerts"),
          readRows(pool, "notifications"),
          readRows(pool, "support_team"),
        ])

      return {
        summary: rows[0].data,
        equipment: equipmentRows,
        alerts: alertRows,
        notifications: notificationRows,
        supportTeam: teamRows.map(({ name, role }) => ({ name, role })),
      }
    },
    getEquipment: () => readRows(pool, "equipment"),
    getEquipmentById: async (id) => {
      const { rows } = await pool.query(
        "SELECT data FROM equipment WHERE id = $1",
        [id],
      )
      return rows[0]?.data ?? null
    },
    getNotifications: () => readRows(pool, "notifications"),
    getAlerts: () => readRows(pool, "alerts"),
    createSupportRequest: async (message, team) => {
      const ticketId = `A-${randomUUID().slice(0, 8).toUpperCase()}`
      const { rows } = await pool.query(
        "INSERT INTO support_requests (ticket_id, team, message) VALUES ($1, $2, $3) RETURNING created_at",
        [ticketId, team, message],
      )
      return { ticketId, updatedAt: rows[0].created_at.toISOString() }
    },
    registerUser: async ({ email, name, company, password }) => {
      const credentials = await hashPassword(password)
      const id = randomUUID()
      try {
        await pool.query(
          "INSERT INTO app_users (id, email, name, company, role, password_salt, password_hash) VALUES ($1, $2, $3, $4, 'renter', $5, $6)",
          [
            id,
            normalizeEmail(email),
            name.trim(),
            company.trim(),
            credentials.salt,
            credentials.hash,
          ],
        )
      } catch (error) {
        if (error.code === "23505") return null
        throw error
      }

      const user = publicUser({
        id,
        email: normalizeEmail(email),
        name: name.trim(),
        company: company.trim(),
        role: "renter",
      })
      return { user, session: await createSession(pool, user) }
    },
    loginUser: async ({ email, password }) => {
      const { rows } = await pool.query(
        "SELECT id, email, name, company, role, password_salt, password_hash FROM app_users WHERE email = $1",
        [normalizeEmail(email)],
      )
      const account = rows[0]
      if (password.length > 128) return null
      const passwordMatches = await verifyPassword(
        password,
        account?.password_salt ?? dummyCredentials.salt,
        account?.password_hash ?? dummyCredentials.hash,
      )
      if (!account || !passwordMatches) {
        return null
      }

      const user = publicUser(account)
      return { user, session: await createSession(pool, user) }
    },
    getSession: async (token) => {
      const { rows } = await pool.query(
        "SELECT u.id, u.email, u.name, u.company, u.role FROM app_sessions s JOIN app_users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now()",
        [hashToken(token)],
      )
      return rows[0] ? publicUser(rows[0]) : null
    },
    logout: async (token) => {
      await pool.query("DELETE FROM app_sessions WHERE token_hash = $1", [
        hashToken(token),
      ])
    },
    insertTelemetry: async (readings) => {
      await pool.query(
        `INSERT INTO telemetry_readings
           (equipment_id, recorded_at, temperature, vibration, rpm, pressure, source)
         SELECT * FROM unnest($1::text[], $2::timestamptz[], $3::real[], $4::real[], $5::real[], $6::real[], $7::text[])`,
        [
          readings.map((r) => r.equipmentId),
          readings.map((r) => r.recordedAt),
          readings.map((r) => r.temperature),
          readings.map((r) => r.vibration),
          readings.map((r) => r.rpm),
          readings.map((r) => r.pressure),
          readings.map((r) => r.source),
        ],
      )
    },
    getRecentTelemetry: async (perEquipment) => {
      const { rows } = await pool.query(
        `SELECT equipment_id, recorded_at, temperature, vibration, rpm, pressure, source
           FROM (
             SELECT *, row_number() OVER (PARTITION BY equipment_id ORDER BY recorded_at DESC) AS rn
               FROM telemetry_readings
              WHERE recorded_at > now() - interval '10 minutes'
           ) recent
          WHERE rn <= $1
          ORDER BY recorded_at`,
        [perEquipment],
      )
      return rows.map((row) => ({
        equipmentId: row.equipment_id,
        recordedAt: row.recorded_at.toISOString(),
        temperature: row.temperature,
        vibration: row.vibration,
        rpm: row.rpm,
        pressure: row.pressure,
        source: row.source,
      }))
    },
    getBookedRanges: async (equipmentId, from, to, viewerId) => {
      const { rows } = await pool.query(
        `SELECT ${bookingColumns} FROM bookings
          WHERE equipment_id = $1 AND status = 'confirmed'
            AND start_date <= $3::date AND end_date >= $2::date
          ORDER BY start_date`,
        [equipmentId, from, to],
      )
      return rows.map((row) => toBooking(row, viewerId))
    },
    getUserBookings: async (userId) => {
      const { rows } = await pool.query(
        `SELECT ${bookingColumns} FROM bookings
          WHERE user_id = $1 AND status = 'confirmed' AND end_date >= current_date
          ORDER BY start_date`,
        [userId],
      )
      return rows.map((row) => toBooking(row, userId))
    },
    // Давхардлыг транзакц + advisory lock-оор хамгаална: нэг төхөөрөмжид
    // зэрэг ирсэн хоёр хүсэлт дараалж шалгагдана.
    createBooking: async ({ equipmentId, user, startDate, endDate, note }) => {
      const client = await pool.connect()
      try {
        await client.query("BEGIN")
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          `booking:${equipmentId}`,
        ])
        const { rows: conflicts } = await client.query(
          `SELECT to_char(start_date, 'YYYY-MM-DD') AS start_date,
                  to_char(end_date, 'YYYY-MM-DD') AS end_date
             FROM bookings
            WHERE equipment_id = $1 AND status = 'confirmed'
              AND start_date <= $3::date AND end_date >= $2::date
            ORDER BY start_date LIMIT 1`,
          [equipmentId, startDate, endDate],
        )
        if (conflicts[0]) {
          await client.query("ROLLBACK")
          return {
            conflict: { startDate: conflicts[0].start_date, endDate: conflicts[0].end_date },
          }
        }
        const { rows } = await client.query(
          `INSERT INTO bookings (id, equipment_id, user_id, tenant, start_date, end_date, note)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING ${bookingColumns}`,
          [randomUUID(), equipmentId, user.id, user.company || user.name, startDate, endDate, note],
        )
        await client.query("COMMIT")
        return { booking: toBooking(rows[0], user.id) }
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {})
        throw error
      } finally {
        client.release()
      }
    },
    cancelBooking: async (id, userId) => {
      const { rowCount } = await pool.query(
        `UPDATE bookings SET status = 'cancelled'
          WHERE id = $1 AND user_id = $2 AND status = 'confirmed' AND start_date > current_date`,
        [id, userId],
      )
      return rowCount > 0
    },
    pruneTelemetry: async (hours) => {
      await pool.query(
        "DELETE FROM telemetry_readings WHERE recorded_at < now() - make_interval(hours => $1)",
        [hours],
      )
    },
  }
}
