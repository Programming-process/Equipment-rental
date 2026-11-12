import { timingSafeEqual } from "node:crypto"

// 2D талбайн схем. Координатууд нь SVG viewBox (360 x 220) нэгжээр.
export const siteMap = {
  width: 360,
  height: 220,
  zones: [
    { id: "west-1", label: "Баруун талбай · Хашаа 1", x: 8, y: 8, w: 104, h: 92, kind: "yard" },
    { id: "block-b", label: "Нарны зам · Блок B", x: 126, y: 8, w: 110, h: 92, kind: "block" },
    { id: "block-c", label: "Талбай 12 · Блок C", x: 250, y: 8, w: 102, h: 110, kind: "block" },
    { id: "storage", label: "Номын сан · Хадгалах", x: 8, y: 120, w: 104, h: 92, kind: "storage" },
    { id: "east-2", label: "Зүүн талбай · Хашаа 2", x: 250, y: 132, w: 102, h: 80, kind: "yard" },
  ],
  roads: [
    { x: 112, y: 100, w: 138, h: 20 },
    { x: 116, y: 120, w: 20, h: 92 },
  ],
  gate: { x: 126, y: 212, label: "Хаалга" },
}

export const equipmentPositions = {
  "DRL-UB-0247": { x: 180, y: 56 },
  "GEN-0162": { x: 300, y: 172 },
  "MIX-4993": { x: 300, y: 62 },
  "EXC-0914": { x: 60, y: 54 },
  "TLS-1318": { x: 60, y: 166 },
}

export const thresholds = {
  temperature: { warn: 85, critical: 95 },
  vibration: { warn: 6, critical: 8 },
  pressure: { warn: 200, critical: 220 },
}

const metrics = ["temperature", "vibration", "rpm", "pressure"]
const historySize = 120
const tickMs = 1000
const externalHoldMs = 10_000
const retentionHours = 24

// Симуляторын суурь утгууд (бодит сенсор холбогдоогүй үед).
const profiles = {
  "DRL-UB-0247": { temperature: 78, vibration: 4.8, rpm: 1480, pressure: 165 },
  "GEN-0162": { temperature: 64, vibration: 2.6, rpm: 1500, pressure: null },
  "MIX-4993": { temperature: 89, vibration: 6.2, rpm: 1820, pressure: 184, drift: true },
}

const noise = { temperature: 0.4, vibration: 0.25, rpm: 18, pressure: 2.5 }

const round = (value, digits) =>
  value === null ? null : Math.round(value * 10 ** digits) / 10 ** digits

export const levelFor = (reading) => {
  let level = "ok"
  for (const [metric, limit] of Object.entries(thresholds)) {
    const value = reading[metric]
    if (typeof value !== "number") continue
    if (value >= limit.critical) return "critical"
    if (value >= limit.warn) level = "warn"
  }
  return level
}

const toReading = (equipmentId, values, recordedAt, source) => {
  const reading = {
    equipmentId,
    recordedAt: new Date(recordedAt).toISOString(),
    temperature: round(values.temperature, 1),
    vibration: round(values.vibration, 2),
    rpm: values.rpm === null ? null : Math.round(values.rpm),
    pressure: round(values.pressure, 0),
    source,
  }
  return { ...reading, level: levelFor(reading) }
}

const isFiniteOrNull = (value) =>
  value === null || value === undefined || Number.isFinite(value)

export const createTelemetryHub = ({ database, equipmentIds }) => {
  const knownIds = new Set(equipmentIds)
  const history = new Map(equipmentIds.map((id) => [id, []]))
  const simState = new Map()
  const lastExternalAt = new Map()
  const clients = new Set()
  const timers = []
  let persistChain = Promise.resolve()

  const remember = (reading) => {
    const list = history.get(reading.equipmentId)
    list.push(reading)
    if (list.length > historySize) list.splice(0, list.length - historySize)
  }

  const send = (res, event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  const broadcast = (readings) => {
    for (const client of clients) send(client, "telemetry", readings)
  }

  const persist = (readings) => {
    if (!database || readings.length === 0) return
    persistChain = persistChain
      .then(() => database.insertTelemetry(readings))
      .catch((error) => console.error("Could not store telemetry:", error))
  }

  const publish = (readings) => {
    readings.forEach(remember)
    broadcast(readings)
    persist(readings)
  }

  const simulate = (now) => {
    const readings = []
    for (const [id, profile] of Object.entries(profiles)) {
      if (!knownIds.has(id)) continue
      if (now - (lastExternalAt.get(id) ?? 0) < externalHoldMs) continue

      const state = simState.get(id) ?? { ...profile }
      const next = {}
      for (const metric of metrics) {
        if (profile[metric] === null) {
          next[metric] = null
          continue
        }
        let base = profile[metric]
        if (profile.drift && metric === "temperature") {
          base += 7 * Math.sin(now / 45_000)
        }
        if (profile.drift && metric === "vibration") {
          base += 1.6 * Math.sin(now / 38_000)
        }
        const value =
          state[metric] +
          (base - state[metric]) * 0.15 +
          (Math.random() * 2 - 1) * noise[metric]
        next[metric] = Math.max(0, value)
      }
      simState.set(id, next)
      readings.push(toReading(id, next, now, "simulator"))
    }
    if (readings.length) publish(readings)
  }

  const start = async () => {
    if (database) {
      try {
        const rows = await database.getRecentTelemetry(historySize)
        for (const row of rows) {
          if (!knownIds.has(row.equipmentId)) continue
          remember({ ...row, level: levelFor(row) })
          simState.set(row.equipmentId, {
            temperature: row.temperature,
            vibration: row.vibration,
            rpm: row.rpm,
            pressure: row.pressure,
          })
        }
      } catch (error) {
        console.error("Could not load telemetry history:", error)
      }
    }

    timers.push(setInterval(() => simulate(Date.now()), tickMs))
    timers.push(
      setInterval(() => {
        for (const client of clients) client.write(": ping\n\n")
      }, 15_000),
    )
    if (database) {
      timers.push(
        setInterval(
          () => {
            database
              .pruneTelemetry(retentionHours)
              .catch((error) => console.error("Could not prune telemetry:", error))
          },
          10 * 60 * 1000,
        ),
      )
    }
  }

  const snapshot = () => ({
    siteMap,
    thresholds,
    positions: equipmentPositions,
    history: Object.fromEntries(history),
    serverTime: new Date().toISOString(),
  })

  const subscribe = (res) => {
    clients.add(res)
    send(res, "snapshot", snapshot())
    return () => clients.delete(res)
  }

  // Бодит IoT төхөөрөмжөөс ирсэн өгөгдөл. Алдаатай бол string буцаана.
  const ingest = (body, now = Date.now()) => {
    const items = Array.isArray(body) ? body : [body]
    if (items.length === 0 || items.length > 100) return "1-100 хэмжилт илгээнэ үү."

    const readings = []
    for (const item of items) {
      if (!item || typeof item !== "object") return "Буруу формат."
      const { equipmentId, temperature = null, vibration = null, rpm = null, pressure = null } = item
      if (!knownIds.has(equipmentId)) return `Тодорхойгүй төхөөрөмж: ${String(equipmentId)}`
      if (![temperature, vibration, rpm, pressure].every(isFiniteOrNull)) {
        return "Сенсорын утга тоо байх ёстой."
      }
      lastExternalAt.set(equipmentId, now)
      readings.push(
        toReading(equipmentId, { temperature, vibration, rpm, pressure }, now, "device"),
      )
    }
    publish(readings)
    return null
  }

  const stop = () => {
    timers.forEach(clearInterval)
    for (const client of clients) client.end()
    clients.clear()
  }

  return { start, stop, subscribe, ingest, snapshot }
}

export const deviceKeyMatches = (provided) => {
  const expected = process.env.TELEMETRY_INGEST_KEY
  if (!expected || typeof provided !== "string") return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
