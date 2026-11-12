import { useEffect, useMemo, useRef, useState } from "react";
import {
  StreamAuthError,
  streamTelemetry,
  type EquipmentItem,
  type TelemetryLevel,
  type TelemetryReading,
  type TelemetrySnapshot,
} from "./lib/api";

type Metric = "temperature" | "vibration" | "rpm" | "pressure";
type Connection = "connecting" | "live" | "reconnecting" | "unauthorized";
type MarkerState = TelemetryLevel | "offline";

const chartPoints = 60;
const offlineAfterMs = 5000;

const metricInfo: Record<Metric, { label: string; unit: string; digits: number }> = {
  temperature: { label: "Температур", unit: "°C", digits: 1 },
  vibration: { label: "Чичиргээ", unit: "mm/s", digits: 2 },
  rpm: { label: "Эргэлт", unit: "RPM", digits: 0 },
  pressure: { label: "Даралт", unit: "bar", digits: 0 },
};

const stateColor: Record<MarkerState, string> = {
  ok: "#238a62",
  warn: "#bd7111",
  critical: "#d8463e",
  offline: "#8a99a3",
};

const stateLabel: Record<MarkerState, string> = {
  ok: "Хэвийн",
  warn: "Анхаарах",
  critical: "Аюултай",
  offline: "Офлайн",
};

const zoneFill: Record<string, string> = {
  block: "#f4f8fa",
  yard: "#f6f8f4",
  storage: "#f8f6f2",
};

const formatValue = (metric: Metric, value: number | null) =>
  value === null
    ? "—"
    : value.toLocaleString("en-US", {
        minimumFractionDigits: metricInfo[metric].digits,
        maximumFractionDigits: metricInfo[metric].digits,
      });

export default function LiveSiteMonitor({
  equipment,
}: {
  equipment: EquipmentItem[];
}) {
  const [meta, setMeta] = useState<Omit<TelemetrySnapshot, "history"> | null>(null);
  const [history, setHistory] = useState<Record<string, TelemetryReading[]>>({});
  const [connection, setConnection] = useState<Connection>("connecting");
  const [authMessage, setAuthMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>("temperature");
  const [now, setNow] = useState(() => Date.now());
  // Серверийн цаг ба браузерын цагийн зөрүү.
  const clockOffset = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    const connect = async () => {
      try {
        await streamTelemetry((event) => {
          if (event.type === "snapshot") {
            const { history: initial, ...rest } = event.data;
            clockOffset.current = Date.parse(event.data.serverTime) - Date.now();
            setMeta(rest);
            setHistory(
              Object.fromEntries(
                Object.entries(initial).map(([id, list]) => [id, list.slice(-chartPoints)]),
              ),
            );
            setConnection("live");
            attempt = 0;
          } else if (event.type === "telemetry") {
            setHistory((previous) => {
              const next = { ...previous };
              for (const reading of event.data) {
                next[reading.equipmentId] = [
                  ...(next[reading.equipmentId] ?? []),
                  reading,
                ].slice(-chartPoints);
              }
              return next;
            });
          } else if (event.type === "expired") {
            controller.abort();
            setAuthMessage("Нэвтрэх хугацаа дууссан. Дахин нэвтэрнэ үү.");
            setConnection("unauthorized");
          }
        }, controller.signal);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof StreamAuthError) {
          setAuthMessage(error.message);
          setConnection("unauthorized");
          return;
        }
      }
      if (controller.signal.aborted) return;
      setConnection("reconnecting");
      attempt += 1;
      retryTimer = setTimeout(connect, Math.min(15_000, 1000 * 2 ** (attempt - 1)));
    };

    void connect();
    const clock = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      controller.abort();
      clearTimeout(retryTimer);
      clearInterval(clock);
    };
  }, []);

  const serverNow = now + clockOffset.current;

  const markers = useMemo(() => {
    if (!meta) return [];
    return equipment
      .filter((item) => meta.positions[item.id])
      .map((item) => {
        const readings = history[item.id] ?? [];
        const latest = readings.at(-1) ?? null;
        const age = latest ? serverNow - Date.parse(latest.recordedAt) : Infinity;
        const state: MarkerState =
          latest && age < offlineAfterMs ? latest.level : "offline";
        return { item, position: meta.positions[item.id], latest, readings, state, age };
      });
  }, [equipment, history, meta, serverNow]);

  const counts = useMemo(() => {
    const result: Record<MarkerState, number> = { ok: 0, warn: 0, critical: 0, offline: 0 };
    markers.forEach((marker) => (result[marker.state] += 1));
    return result;
  }, [markers]);

  // Анхдагчаар хамгийн эрсдэлтэй төхөөрөмжийг сонгоно.
  const selected =
    markers.find((marker) => marker.item.id === selectedId) ??
    markers.find((marker) => marker.state === "critical") ??
    markers.find((marker) => marker.state !== "offline") ??
    markers[0];

  if (connection === "unauthorized") {
    return (
      <section className="rounded-[10px] border border-[#dce4e8] bg-white p-3 text-[11px] text-[#6c7c87]">
        <p className="font-['Inter:Bold'] text-[12px] font-bold text-[#14212a]">
          Талбайн бодит цагийн хяналт
        </p>
        <p className="mt-1">{authMessage}</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[10px] border border-[#dce4e8] bg-white shadow-[0_2px_8px_rgba(20,33,42,0.04)]">
      <div className="flex items-center justify-between gap-2 border-b border-[#e4eaed] p-3">
        <div className="min-w-0">
          <h2 className="font-['Inter:Bold'] text-[12px] font-bold">
            Талбайн бодит цагийн хяналт
          </h2>
          <p className="mt-0.5 text-[9px] text-[#7c8a93]">
            {(["critical", "warn", "ok", "offline"] as MarkerState[])
              .filter((state) => counts[state] > 0)
              .map((state) => `${counts[state]} ${stateLabel[state].toLowerCase()}`)
              .join(" · ") || "Өгөгдөл ачаалж байна"}
          </p>
        </div>
        <ConnectionBadge connection={connection} />
      </div>

      {!meta ? (
        <div className="flex h-[180px] items-center justify-center text-[10px] text-[#7c8a93]">
          Телеметрт холбогдож байна…
        </div>
      ) : (
        <>
          <div className="bg-[#fbfcfd] p-2">
            <svg
              aria-label="Талбайн 2D схем"
              className="block h-auto w-full"
              role="img"
              viewBox={`0 0 ${meta.siteMap.width} ${meta.siteMap.height}`}
            >
              {meta.siteMap.roads.map((road, index) => (
                <rect fill="#e6ecef" height={road.h} key={index} rx={2} width={road.w} x={road.x} y={road.y} />
              ))}
              {meta.siteMap.zones.map((zone) => (
                <g key={zone.id}>
                  <rect
                    fill={zoneFill[zone.kind] ?? "#f4f7f8"}
                    height={zone.h}
                    rx={6}
                    stroke="#d3dde2"
                    strokeDasharray={zone.kind === "yard" ? "4 3" : undefined}
                    width={zone.w}
                    x={zone.x}
                    y={zone.y}
                  />
                  <text fill="#7b8a94" fontSize={6.5} x={zone.x + 6} y={zone.y + 11}>
                    {zone.label}
                  </text>
                </g>
              ))}
              <text
                fill="#9aa7af"
                fontSize={6.5}
                textAnchor="middle"
                x={meta.siteMap.gate.x}
                y={meta.siteMap.gate.y + 6}
              >
                ▲ {meta.siteMap.gate.label}
              </text>

              {markers.map((marker) => {
                const color = stateColor[marker.state];
                const isSelected = marker.item.id === selected?.item.id;
                return (
                  <g
                    aria-label={`${marker.item.name}: ${stateLabel[marker.state]}`}
                    className="cursor-pointer outline-none"
                    key={marker.item.id}
                    onClick={() => setSelectedId(marker.item.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedId(marker.item.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    {marker.state === "critical" && (
                      <circle cx={marker.position.x} cy={marker.position.y} fill={color} opacity={0.35} r={10}>
                        <animate attributeName="r" dur="1.4s" repeatCount="indefinite" values="10;20;10" />
                        <animate attributeName="opacity" dur="1.4s" repeatCount="indefinite" values="0.4;0;0.4" />
                      </circle>
                    )}
                    {isSelected && (
                      <circle
                        cx={marker.position.x}
                        cy={marker.position.y}
                        fill="none"
                        r={14}
                        stroke="#14212a"
                        strokeWidth={1.5}
                      />
                    )}
                    <circle
                      cx={marker.position.x}
                      cy={marker.position.y}
                      fill={color}
                      r={9}
                      stroke="white"
                      strokeWidth={2}
                    />
                    <text
                      fill="#14212a"
                      fontSize={6.5}
                      fontWeight={700}
                      textAnchor="middle"
                      x={marker.position.x}
                      y={marker.position.y + 24}
                    >
                      {marker.item.id}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="mt-1 flex flex-wrap gap-3 px-1 text-[8px] text-[#6c7c87]">
              {(Object.keys(stateColor) as MarkerState[]).map((state) => (
                <span className="flex items-center gap-1" key={state}>
                  <span className="size-2 rounded-full" style={{ background: stateColor[state] }} />
                  {stateLabel[state]}
                </span>
              ))}
            </div>
          </div>

          {selected && (
            <SelectedPanel
              marker={selected}
              metric={metric}
              onMetric={setMetric}
              thresholds={meta.thresholds}
            />
          )}
        </>
      )}
    </section>
  );
}

function ConnectionBadge({ connection }: { connection: Connection }) {
  const live = connection === "live";
  return (
    <span
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 font-['Inter:Bold'] text-[9px] font-bold ${
        live ? "bg-[#e3f3ec] text-[#238a62]" : "bg-[#fff2dd] text-[#bd7111]"
      }`}
    >
      <span className="relative flex size-1.5">
        {live && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#238a62] opacity-60" />
        )}
        <span
          className={`relative inline-flex size-1.5 rounded-full ${live ? "bg-[#238a62]" : "bg-[#bd7111]"}`}
        />
      </span>
      {live ? "LIVE" : connection === "connecting" ? "Холбогдож байна" : "Дахин холбогдож байна"}
    </span>
  );
}

function SelectedPanel({
  marker,
  metric,
  onMetric,
  thresholds,
}: {
  marker: {
    item: EquipmentItem;
    latest: TelemetryReading | null;
    readings: TelemetryReading[];
    state: MarkerState;
    age: number;
  };
  metric: Metric;
  onMetric: (metric: Metric) => void;
  thresholds: TelemetrySnapshot["thresholds"];
}) {
  const { item, latest, readings, state, age } = marker;
  const color = stateColor[state];

  const metricLevel = (key: Metric, value: number | null): TelemetryLevel => {
    if (value === null || key === "rpm") return "ok";
    const limit = thresholds[key];
    return value >= limit.critical ? "critical" : value >= limit.warn ? "warn" : "ok";
  };

  return (
    <div className="border-t border-[#e4eaed] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-['Inter:Bold'] text-[12px] font-bold">{item.name}</p>
          <p className="mt-0.5 truncate text-[9px] text-[#7c8a93]">
            {item.id} · {item.location}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-1 font-['Inter:Bold'] text-[9px] font-bold text-white"
          style={{ background: color }}
        >
          {stateLabel[state]}
        </span>
      </div>

      {state === "offline" ? (
        <p className="mt-3 rounded-lg bg-[#f3f6f7] p-3 text-[10px] text-[#6c7c87]">
          {latest
            ? `Сүүлийн өгөгдөл ${Math.round(age / 1000)} секундын өмнө ирсэн. Сенсорын холболтыг шалгана уу.`
            : "Энэ төхөөрөмжид сенсор холбогдоогүй байна."}
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {(Object.keys(metricInfo) as Metric[]).map((key) => {
              const value = latest?.[key] ?? null;
              const level = metricLevel(key, value);
              const active = key === metric;
              return (
                <button
                  className={`rounded-lg border p-2 text-center ${
                    active ? "border-[#1677a8] bg-[#edf7ff]" : "border-[#e2e8eb] bg-white"
                  } disabled:opacity-50`}
                  disabled={value === null}
                  key={key}
                  onClick={() => onMetric(key)}
                  type="button"
                >
                  <p
                    className="font-['Roboto_Mono:Bold'] text-[13px] font-bold tabular-nums"
                    style={{ color: level === "ok" ? "#1677a8" : stateColor[level] }}
                  >
                    {formatValue(key, value)}
                  </p>
                  <p className="mt-1 text-[7px] text-[#788791]">{metricInfo[key].unit}</p>
                </button>
              );
            })}
          </div>
          <Sparkline
            metric={metric}
            readings={readings}
            threshold={metric === "rpm" ? null : thresholds[metric]}
          />
          <p className="mt-1 text-right text-[8px] text-[#9aa7af]">
            Эх үүсвэр: {latest?.source === "device" ? "IoT сенсор" : "Симулятор"} · 1 Hz
          </p>
        </>
      )}
    </div>
  );
}

function Sparkline({
  metric,
  readings,
  threshold,
}: {
  metric: Metric;
  readings: TelemetryReading[];
  threshold: { warn: number; critical: number } | null;
}) {
  const width = 320;
  const height = 90;
  const pad = 6;
  const values = readings
    .map((reading) => reading[metric])
    .filter((value): value is number => value !== null);

  if (values.length < 2) {
    return (
      <div className="mt-3 flex h-[90px] items-center justify-center rounded-lg border border-[#e2e8eb] text-[9px] text-[#9aa7af]">
        Өгөгдөл хуримтлагдаж байна…
      </div>
    );
  }

  const reference = threshold ? [threshold.warn, threshold.critical] : [];
  const lo = Math.min(...values, ...reference.map((v) => v * 0.97));
  const hi = Math.max(...values, ...reference.map((v) => v * 1.01));
  const span = hi - lo || 1;
  const x = (index: number) => pad + (index / (chartPoints - 1)) * (width - pad * 2);
  const y = (value: number) => height - pad - ((value - lo) / span) * (height - pad * 2);
  const offset = chartPoints - values.length;
  const points = values.map((value, index) => `${x(index + offset)},${y(value)}`).join(" ");
  const last = values[values.length - 1];
  const lineColor =
    threshold && last >= threshold.critical
      ? stateColor.critical
      : threshold && last >= threshold.warn
        ? stateColor.warn
        : "#1677a8";

  return (
    <div className="mt-3 rounded-lg border border-[#e2e8eb] p-2">
      <div className="mb-1 flex items-center justify-between text-[9px]">
        <span className="font-['Inter:Bold'] font-bold">
          {metricInfo[metric].label} · сүүлийн 60 сек
        </span>
        <span className="text-[#7c8a93]">
          {formatValue(metric, Math.min(...values))} – {formatValue(metric, Math.max(...values))}{" "}
          {metricInfo[metric].unit}
        </span>
      </div>
      <svg className="block h-[90px] w-full" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
        {threshold &&
          (["warn", "critical"] as const).map((key) => (
            <line
              key={key}
              stroke={stateColor[key]}
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              x1={pad}
              x2={width - pad}
              y1={y(threshold[key])}
              y2={y(threshold[key])}
            />
          ))}
        <polyline
          fill="none"
          points={points}
          stroke={lineColor}
          strokeLinejoin="round"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
