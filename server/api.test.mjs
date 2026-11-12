import { spawn } from "node:child_process"
import { createServer } from "node:net"
import { once } from "node:events"
import { randomUUID } from "node:crypto"
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import pg from "pg"

const { Pool } = pg

const getAvailablePort = async () => {
  const server = createServer()
  server.listen(0, "127.0.0.1")
  await once(server, "listening")
  const { port } = server.address()
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
  return port
}

const startApiServer = async (databaseUrl = process.env.DATABASE_URL ?? "") => {
  const port = await getAvailablePort()
  const child = spawn("node", ["server/index.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), DATABASE_URL: databaseUrl },
    stdio: ["ignore", "pipe", "pipe"],
  })
  let output = ""
  child.stdout.on("data", (chunk) => (output += chunk))
  child.stderr.on("data", (chunk) => (output += chunk))
  const baseUrl = `http://127.0.0.1:${port}`
  const started = Date.now()

  while (Date.now() - started < 10000) {
    if (child.exitCode !== null) {
      throw new Error(`API server exited during startup:\n${output}`)
    }

    try {
      const response = await fetch(`${baseUrl}/api/health`)
      if (response.ok) return { child, baseUrl, output: () => output }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  child.kill("SIGTERM")
  throw new Error(`Timed out starting API server:\n${output}`)
}

const stopApiServer = async (server) => {
  server.child.kill("SIGTERM")
  await once(server.child, "exit")
}

describe("ops api authentication", () => {
  it("reports when PostgreSQL is not configured and disables account auth", async () => {
    const server = await startApiServer("")

    try {
      const health = await fetch(`${server.baseUrl}/api/health`).then((res) =>
        res.json(),
      )
      assert.equal(health.database, "not_configured")

      const response = await fetch(`${server.baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: "password",
        }),
      })
      assert.equal(response.status, 503)
    } finally {
      await stopApiServer(server)
    }
  })

  it(
    "registers renter accounts, authenticates them, and keeps admin signup restricted",
    { skip: !process.env.DATABASE_URL },
    async () => {
      const server = await startApiServer()
      const email = `api-test-${randomUUID()}@example.com`
      const pool = new Pool({ connectionString: process.env.DATABASE_URL })

      try {
        const health = await fetch(`${server.baseUrl}/api/health`).then((res) =>
          res.json(),
        )
        assert.equal(health.database, "connected")

        const unauthenticated = await fetch(`${server.baseUrl}/api/dashboard`)
        assert.equal(unauthenticated.status, 401)

        const registration = await fetch(
          `${server.baseUrl}/api/auth/register`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: email.toUpperCase(),
              name: "API Test",
              company: "Test Company",
              password: "valid-password-123",
              role: "admin",
            }),
          },
        )
        const created = await registration.json()
        assert.equal(registration.status, 201)
        assert.equal(created.user.role, "renter")
        assert.equal(created.user.email, email)
        assert.ok(created.session.token)

        const { rows: credentials } = await pool.query(
          "SELECT password_hash, password_salt FROM app_users WHERE email = $1",
          [email],
        )
        assert.equal(credentials.length, 1)
        assert.notEqual(credentials[0].password_hash, "valid-password-123")

        const dashboard = await fetch(`${server.baseUrl}/api/dashboard`, {
          headers: { Authorization: `Bearer ${created.session.token}` },
        })
        assert.equal(dashboard.status, 200)

        const duplicate = await fetch(`${server.baseUrl}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            name: "API Test",
            company: "Test Company",
            password: "valid-password-123",
          }),
        })
        assert.equal(duplicate.status, 409)

        const invalidLogin = await fetch(`${server.baseUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: "wrong-password-123" }),
        })
        assert.equal(invalidLogin.status, 401)

        const adminLogin = await fetch(`${server.baseUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD,
          }),
        })
        const admin = await adminLogin.json()
        assert.equal(adminLogin.status, 200)
        assert.equal(admin.user.role, "admin")
        await fetch(`${server.baseUrl}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${admin.session.token}` },
        })

        await fetch(`${server.baseUrl}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${created.session.token}` },
        })
        const afterLogout = await fetch(`${server.baseUrl}/api/dashboard`, {
          headers: { Authorization: `Bearer ${created.session.token}` },
        })
        assert.equal(afterLogout.status, 401)
      } finally {
        await pool.query("DELETE FROM app_users WHERE email = $1", [email])
        await pool.end()
        await stopApiServer(server)
      }
    },
  )
})
