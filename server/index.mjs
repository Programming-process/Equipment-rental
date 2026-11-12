import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import cors from "cors"
import express from "express"
import { createDatabaseStore } from "./db.mjs"
import { createTelemetryHub, deviceKeyMatches } from "./telemetry.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
const port = Number(process.env.PORT || 4000)
const distPath = path.join(__dirname, "..", "dist")

app.disable("x-powered-by")
app.use(cors())
app.use(express.json())

const equipment = [
  {
    id: "DRL-UB-0247",
    name: "Өрмийн машин D45",
    model: "Atlas Copco D45",
    status: "Түрээстэй",
    meta: "DRL-UB-0247",
    location: "Нарны зам · Блок B",
    assignee: "Б. Бат",
    tenant: "Хөх Тэнгэр ХХК",
    due: "10-р сарын 18",
    telemetry: { vibration: "4.82", temperature: "78.6", rpm: "1,482" },
    live: true,
  },
  {
    id: "GEN-0162",
    name: "Генератор 150 кВА",
    model: "Cummins 150 kVA",
    status: "Бэлэн",
    meta: "GEN-0162",
    location: "Зүүн талбай · Хашаа 2",
    assignee: "С. Уран",
    tenant: "Монкон ХХК",
    due: "10-р сарын 14",
    telemetry: { vibration: "2.58", temperature: "64.2", rpm: "840" },
    live: true,
  },
  {
    id: "MIX-4993",
    name: "Бетон зуурагч 8м³",
    model: "MIX-8 PRO",
    status: "Анхаарах",
    meta: "MIX-4993",
    location: "Талбай 12 · Блок C",
    assignee: "Н. Баяр",
    tenant: "Улаанбаатар бетон",
    due: "10-р сарын 16",
    telemetry: { vibration: "8.41", temperature: "96.2", rpm: "1,824" },
    live: true,
  },
  {
    id: "EXC-0914",
    name: "Бага оврын экскаватор",
    model: "CAT 308E",
    status: "Засварт",
    meta: "EXC-0914",
    location: "Баруун талбай · Хашаа 1",
    assignee: "Г. Дэлгэр",
    tenant: "Говь зам ХХК",
    due: "10-р сарын 09",
    telemetry: { vibration: "3.75", temperature: "72.4", rpm: "1,180" },
    live: false,
  },
  {
    id: "TLS-1318",
    name: "Гар багаж / багц",
    model: "Tool kit 12",
    status: "Бэлэн",
    meta: "TLS-1318",
    location: "Номын сан · Хадгалах",
    assignee: "Б. Бөх",
    tenant: "Улаанбаатар логистик",
    due: "10-р сарын 20",
    telemetry: { vibration: "0.86", temperature: "32.1", rpm: "0" },
    live: false,
  },
]

const alerts = [
  {
    id: "A-8842",
    title: "Бетон зуурагчийн температур",
    equipmentId: "MIX-4993",
    risk: "93.4%",
    location: "Талбай 12",
    severity: "high",
    description: "Температур 96.2°C · автомат мониторинг идэвхтэй",
  },
  {
    id: "A-7710",
    title: "Генераторын түлшний түвшин",
    equipmentId: "GEN-0162",
    risk: "18%",
    location: "Зүүн талбай",
    severity: "warning",
    description: "Багачаалжууд түлшний төлөвийг шалгах шаардлагатай",
  },
]

const notifications = [
  {
    id: "n-1",
    title: "Хөдөлгүүрийн эрсдэл 18 мин",
    meta: "MIX-4993 · Талбай 12",
    type: "alert",
    createdAt: "Өнөөдөр · 12:43",
  },
  {
    id: "n-2",
    title: "Хугацаа 2 цагийн дараа дуусна",
    meta: "Өрмийн машин D45",
    type: "calendar",
    createdAt: "Өнөөдөр · 12:50",
  },
  {
    id: "n-3",
    title: "Check-out амжилттай",
    meta: "GEN-0162 · 09:28",
    type: "success",
    createdAt: "Өнөөдөр · 09:28",
  },
  {
    id: "n-4",
    title: "Check-in хугацаа ойртлоо",
    meta: "DRL-UB-0247 · 12:46",
    type: "warning",
    createdAt: "Өнөөдөр · 12:46",
  },
]

const supportTeam = [
  { name: "Д. Эрдэнэ", role: "Техникч · 7 мин" },
  { name: "С. Номин", role: "Менежер · ONLINE" },
]

const dashboard = {
  summary: {
    totalEquipment: 128,
    rentedToday: 6,
    alerts: 4,
    syncSecondsAgo: "8 сек өмнө",
    siteName: "Улаанбаатар төв",
  },
  equipment,
  alerts,
  notifications,
  supportTeam,
}

const database = await createDatabaseStore({
  dashboard,
  equipment,
  alerts,
  notifications,
  supportTeam,
})
const telemetryHub = createTelemetryHub({
  database,
  equipmentIds: equipment.map((item) => item.id),
})
await telemetryHub.start()

const getBearerToken = (req) => {
  const authorization = req.get("authorization") ?? ""
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : null
}
const requireDatabase = (res) => {
  if (database) return true
  res
    .status(503)
    .json({ message: "Хэрэглэгчийн систем тохируулагдаагүй байна." })
  return false
}
const requireAuthentication = async (req, res, next) => {
  if (!requireDatabase(res)) return
  const token = getBearerToken(req)
  if (!token) {
    return res.status(401).json({ message: "Нэвтрэх шаардлагатай." })
  }

  try {
    const user = await database.getSession(token)
    if (!user) {
      return res.status(401).json({ message: "Нэвтрэх хугацаа дууссан байна." })
    }
    req.user = user
    return next()
  } catch (error) {
    return next(error)
  }
}

if (existsSync(distPath)) {
  app.use(express.static(distPath))

  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(distPath, "index.html"))
  })
}

app.get("/api/health", async (req, res, next) => {
  try {
    await database?.healthCheck()
    res.json({
      status: "ok",
      service: "ops-backend",
      time: new Date().toISOString(),
      database: database ? "connected" : "not_configured",
    })
  } catch (error) {
    next(error)
  }
})

app.post("/api/auth/register", async (req, res, next) => {
  if (!requireDatabase(res)) return
  const { email, name, company, password } = req.body ?? {}
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : ""

  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 100 ||
    typeof company !== "string" ||
    company.trim().length < 2 ||
    company.trim().length > 150 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    normalizedEmail.length > 254 ||
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 128
  ) {
    return res.status(400).json({
      message:
        "Нэр, байгууллага, зөв имэйл болон 12-аас доошгүй тэмдэгттэй нууц үг оруулна уу.",
    })
  }

  try {
    const result = await database.registerUser({
      email: normalizedEmail,
      name,
      company,
      password,
    })
    if (!result) {
      return res
        .status(409)
        .json({ message: "Энэ имэйлээр бүртгэл үүссэн байна." })
    }
    return res
      .status(201)
      .json({ message: "Бүртгэл амжилттай үүслээ.", ...result })
  } catch (error) {
    return next(error)
  }
})

app.post("/api/auth/login", async (req, res, next) => {
  if (!requireDatabase(res)) return
  const { email, password } = req.body ?? {}
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    password.length > 128
  ) {
    return res
      .status(400)
      .json({ message: "Имэйл болон нууц үгээ оруулна уу." })
  }

  try {
    const result = await database.loginUser({ email, password })
    if (!result) {
      return res
        .status(401)
        .json({ message: "Имэйл эсвэл нууц үг буруу байна." })
    }
    return res.json({ message: "Амжилттай нэвтэрлээ.", ...result })
  } catch (error) {
    return next(error)
  }
})

app.post("/api/auth/logout", requireAuthentication, async (req, res, next) => {
  try {
    await database.logout(getBearerToken(req))
    return res.json({ message: "Системээс гарлаа." })
  } catch (error) {
    return next(error)
  }
})

app.get("/api/dashboard", requireAuthentication, async (req, res, next) => {
  try {
    res.json(database ? await database.getDashboard() : dashboard)
  } catch (error) {
    next(error)
  }
})

app.get("/api/equipment", requireAuthentication, async (req, res, next) => {
  try {
    res.json(database ? await database.getEquipment() : equipment)
  } catch (error) {
    next(error)
  }
})

app.get("/api/equipment/:id", requireAuthentication, async (req, res, next) => {
  try {
    const item = database
      ? await database.getEquipmentById(req.params.id)
      : equipment.find((entry) => entry.id === req.params.id)

    if (!item) {
      return res.status(404).json({ message: "Төхөөрөмж олдсонгүй" })
    }

    return res.json(item)
  } catch (error) {
    return next(error)
  }
})

app.get("/api/notifications", requireAuthentication, async (req, res, next) => {
  try {
    res.json(database ? await database.getNotifications() : notifications)
  } catch (error) {
    next(error)
  }
})

app.get("/api/alerts", requireAuthentication, async (req, res, next) => {
  try {
    res.json(database ? await database.getAlerts() : alerts)
  } catch (error) {
    next(error)
  }
})

app.post("/api/support", requireAuthentication, async (req, res, next) => {
  const { message = "Тусламжийн хүсэлт илгээгдлээ", team = "support" } =
    req.body ?? {}

  try {
    const ticket = database
      ? await database.createSupportRequest(message, team)
      : { ticketId: "A-8842", updatedAt: new Date().toISOString() }

    return res.json({ ok: true, message, team, ...ticket })
  } catch (error) {
    return next(error)
  }
})

// ---- Захиалгын хуанли ----
const isoDate = /^\d{4}-\d{2}-\d{2}$/
const parseDay = (value) => {
  if (typeof value !== "string" || !isoDate.test(value)) return null
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : date
}
const dayDiff = (a, b) => Math.round((b - a) / 86_400_000)
// Улаанбаатарын цагаар өнөөдрийн огноо.
const todayInUlaanbaatar = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar" }).format(new Date())
const staffRoles = new Set(["admin", "manager", "fixer"])
const maxBookingDays = 60

app.get(
  "/api/equipment/:id/availability",
  requireAuthentication,
  async (req, res, next) => {
    const from = parseDay(req.query.from)
    const to = parseDay(req.query.to)
    if (!from || !to || to < from || dayDiff(from, to) > 93) {
      return res
        .status(400)
        .json({ message: "from, to огноог YYYY-MM-DD хэлбэрээр (93 хоногоос ихгүй) өгнө үү." })
    }
    try {
      const item = await database.getEquipmentById(req.params.id)
      if (!item) return res.status(404).json({ message: "Төхөөрөмж олдсонгүй" })
      const ranges = await database.getBookedRanges(
        req.params.id,
        req.query.from,
        req.query.to,
        req.user.id,
      )
      const showDetails = staffRoles.has(req.user.role)
      return res.json({
        equipmentId: req.params.id,
        from: req.query.from,
        to: req.query.to,
        today: todayInUlaanbaatar(),
        // Түрээслэгч бусдын захиалгын нэр, тэмдэглэлийг харахгүй.
        booked: ranges.map(({ id, startDate, endDate, mine, tenant, note }) =>
          showDetails || mine
            ? { id, startDate, endDate, mine, tenant, note }
            : { startDate, endDate, mine },
        ),
      })
    } catch (error) {
      return next(error)
    }
  },
)

app.get("/api/bookings/mine", requireAuthentication, async (req, res, next) => {
  try {
    res.json(await database.getUserBookings(req.user.id))
  } catch (error) {
    next(error)
  }
})

app.post("/api/bookings", requireAuthentication, async (req, res, next) => {
  const { equipmentId, startDate, endDate, note = "" } = req.body ?? {}
  const start = parseDay(startDate)
  const end = parseDay(endDate)
  if (typeof equipmentId !== "string" || !start || !end) {
    return res.status(400).json({ message: "Төхөөрөмж болон огноогоо сонгоно уу." })
  }
  if (end < start) {
    return res.status(400).json({ message: "Дуусах огноо эхлэх огнооноос өмнө байна." })
  }
  if (startDate < todayInUlaanbaatar()) {
    return res.status(400).json({ message: "Өнгөрсөн өдрөөр захиалах боломжгүй." })
  }
  if (dayDiff(start, end) + 1 > maxBookingDays) {
    return res
      .status(400)
      .json({ message: `Нэг захиалга ${maxBookingDays} хоногоос хэтрэхгүй.` })
  }
  if (typeof note !== "string" || note.length > 500) {
    return res.status(400).json({ message: "Тэмдэглэл 500 тэмдэгтээс хэтрэхгүй." })
  }

  try {
    const item = await database.getEquipmentById(equipmentId)
    if (!item) return res.status(404).json({ message: "Төхөөрөмж олдсонгүй" })
    const result = await database.createBooking({
      equipmentId,
      user: req.user,
      startDate,
      endDate,
      note: note.trim(),
    })
    if (result.conflict) {
      return res.status(409).json({
        message: `Сонгосон хугацаа давхцаж байна: ${result.conflict.startDate} – ${result.conflict.endDate} аль хэдийн захиалагдсан.`,
        conflict: result.conflict,
      })
    }
    return res.status(201).json(result.booking)
  } catch (error) {
    return next(error)
  }
})

app.delete("/api/bookings/:id", requireAuthentication, async (req, res, next) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) {
    return res.status(404).json({ message: "Захиалга олдсонгүй." })
  }
  try {
    const cancelled = await database.cancelBooking(req.params.id, req.user.id)
    if (!cancelled) {
      return res
        .status(404)
        .json({ message: "Цуцлах боломжтой захиалга олдсонгүй (эхэлсэн захиалгыг цуцлах боломжгүй)." })
    }
    return res.json({ ok: true })
  } catch (error) {
    return next(error)
  }
})

// Бодит цагийн телеметр: админ, менежер, фиксер харна.
const telemetryRoles = new Set(["admin", "manager", "fixer"])

app.get("/api/telemetry/stream", requireAuthentication, (req, res) => {
  if (!telemetryRoles.has(req.user.role)) {
    return res.status(403).json({ message: "Телеметр харах эрхгүй байна." })
  }

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  })
  res.flushHeaders()

  const token = getBearerToken(req)
  const unsubscribe = telemetryHub.subscribe(res)
  // Session хугацаа дуусвал холболтыг хаана.
  const sessionCheck = setInterval(async () => {
    try {
      if (!(await database.getSession(token))) {
        res.write("event: expired\ndata: {}\n\n")
        res.end()
      }
    } catch (error) {
      console.error("Telemetry session check failed:", error)
    }
  }, 30_000)

  req.on("close", () => {
    clearInterval(sessionCheck)
    unsubscribe()
  })
})

// IoT төхөөрөмж өгөгдөл илгээх: X-Device-Key толгой шаардлагатай.
app.post("/api/telemetry", (req, res) => {
  if (!process.env.TELEMETRY_INGEST_KEY) {
    return res
      .status(503)
      .json({ message: "TELEMETRY_INGEST_KEY тохируулагдаагүй байна." })
  }
  if (!deviceKeyMatches(req.get("x-device-key"))) {
    return res.status(401).json({ message: "Төхөөрөмжийн түлхүүр буруу." })
  }
  const error = telemetryHub.ingest(req.body)
  if (error) return res.status(400).json({ message: error })
  return res.status(202).json({ ok: true })
})

app.use((error, req, res, next) => {
  console.error("API request failed:", error)
  res.status(500).json({ message: "Серверийн алдаа гарлаа." })
})

app.listen(port, "0.0.0.0", () => {
  console.log(`Ops backend listening on http://0.0.0.0:${port}`)
})
