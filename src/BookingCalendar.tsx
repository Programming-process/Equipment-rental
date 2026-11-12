import { useCallback, useEffect, useMemo, useState } from "react";
import {
  bookingApi,
  type BookedRange,
  type Booking,
  type EquipmentItem,
} from "./lib/api";

type DayState = "past" | "booked" | "mine" | "free";

const weekdays = ["ДАВ", "МЯГ", "ЛХА", "ПҮР", "БАА", "БЯМ", "НЯМ"];

// Огноог "YYYY-MM-DD" string-ээр хадгална (цагийн бүсийн алдаанаас сэргийлнэ).
const toKey = (date: Date) => date.toISOString().slice(0, 10);
const fromKey = (key: string) => new Date(`${key}T00:00:00Z`);
const addDays = (key: string, days: number) => {
  const date = fromKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return toKey(date);
};
const daysBetween = (a: string, b: string) =>
  Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000) + 1;
const formatDay = (key: string) => {
  const [, month, day] = key.split("-");
  return `${Number(month)}-р сарын ${Number(day)}`;
};

const dayStyles: Record<DayState, string> = {
  free: "bg-[#e3f3ec] text-[#1d6f4f] hover:bg-[#cdebdc]",
  booked: "bg-[#fbe7e5] text-[#c0473f] line-through cursor-not-allowed",
  mine: "bg-[#e2f1f7] text-[#1677a8] ring-1 ring-[#1677a8] cursor-not-allowed",
  past: "bg-[#f4f7f8] text-[#b3bec5] cursor-not-allowed",
};

export default function BookingCalendar({
  equipment,
  initialEquipmentId,
}: {
  equipment: EquipmentItem[];
  initialEquipmentId?: string;
}) {
  const [equipmentId, setEquipmentId] = useState(
    initialEquipmentId ?? equipment[0]?.id ?? "",
  );
  const [month, setMonth] = useState<string | null>(null); // "YYYY-MM-01"
  const [today, setToday] = useState<string | null>(null);
  const [booked, setBooked] = useState<BookedRange[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  // Сул өдрийн мэдээлэл амжилттай ачаалагдсан эсэх. Ачаалаагүй бол өдрүүдийг сул гэж харуулахгүй.
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selected = equipment.find((item) => item.id === equipmentId);

  // Сарын эхэнд өнөөдрийг сервероос авна.
  const monthKey =
    month ??
    `${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar" })
      .format(new Date())
      .slice(0, 7)}-01`;

  const monthEnd = useMemo(() => {
    const date = fromKey(monthKey);
    date.setUTCMonth(date.getUTCMonth() + 1, 0);
    return toKey(date);
  }, [monthKey]);

  const load = useCallback(async () => {
    if (!equipmentId) return;
    setLoading(true);
    setReady(false);
    try {
      const [availability, mine] = await Promise.all([
        bookingApi.getAvailability(equipmentId, monthKey, monthEnd),
        bookingApi.getMine(),
      ]);
      setBooked(availability.booked);
      setToday(availability.today);
      setMyBookings(mine);
      setReady(true);
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Хуанли ачаалж чадсангүй.",
      );
    } finally {
      setLoading(false);
    }
  }, [equipmentId, monthKey, monthEnd]);

  useEffect(() => {
    void load();
  }, [load]);

  const stateOf = useCallback(
    (key: string): DayState => {
      if (today && key < today) return "past";
      const range = booked.find((item) => item.startDate <= key && key <= item.endDate);
      if (range) return range.mine ? "mine" : "booked";
      return "free";
    },
    [booked, today],
  );

  const cells = useMemo(() => {
    const first = fromKey(monthKey);
    const offset = (first.getUTCDay() + 6) % 7;
    const total = daysBetween(monthKey, monthEnd);
    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: total }, (_, index) => addDays(monthKey, index)),
    ];
  }, [monthKey, monthEnd]);

  const freeCount = ready
    ? cells.filter((key) => key && stateOf(key) === "free").length
    : 0;

  const changeMonth = (delta: number) => {
    const date = fromKey(monthKey);
    date.setUTCMonth(date.getUTCMonth() + delta, 1);
    setMonth(toKey(date));
  };

  const resetSelection = () => {
    setStart(null);
    setEnd(null);
  };

  const pickDay = (key: string) => {
    if (!ready || stateOf(key) !== "free") return;
    setError("");
    setSuccess("");
    if (!start || end) {
      setStart(key);
      setEnd(null);
      return;
    }
    if (key < start) {
      setStart(key);
      return;
    }
    // Сонгосон хугацааны дунд захиалагдсан өдөр байвал зөвшөөрөхгүй.
    const blocked = booked.find((item) => item.startDate <= key && item.endDate >= start);
    if (blocked) {
      setError(
        `${formatDay(blocked.startDate)} – ${formatDay(blocked.endDate)} хооронд захиалагдсан тул энэ хугацааг сонгох боломжгүй.`,
      );
      return;
    }
    setEnd(key);
  };

  const rangeEnd = end ?? start;
  const inSelection = (key: string) =>
    Boolean(start && rangeEnd && key >= start && key <= rangeEnd);

  const confirm = async () => {
    if (!start || !rangeEnd) return;
    setSubmitting(true);
    setError("");
    try {
      await bookingApi.create({
        equipmentId,
        startDate: start,
        endDate: rangeEnd,
        note,
      });
      setSuccess(
        `${formatDay(start)} – ${formatDay(rangeEnd)} хугацаанд ${selected?.name ?? equipmentId} амжилттай захиалагдлаа.`,
      );
      resetSelection();
      setNote("");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Захиалга амжилтгүй боллоо.",
      );
    } finally {
      setSubmitting(false);
      void load();
    }
  };

  const cancel = async (id: string) => {
    setError("");
    setSuccess("");
    try {
      await bookingApi.cancel(id);
      setSuccess("Захиалга цуцлагдлаа.");
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Цуцалж чадсангүй.");
    } finally {
      void load();
    }
  };

  const [year, monthNumber] = monthKey.split("-");
  const canGoBack = !today || monthKey > `${today.slice(0, 7)}-01`;
  const myForEquipment = myBookings.filter((item) => item.equipmentId === equipmentId);

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
        {equipment.map((item) => (
          <button
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold ${
              item.id === equipmentId
                ? "border-[#1677a8] bg-[#1677a8] text-white"
                : "border-[#dce4e8] bg-white text-[#42515d]"
            }`}
            key={item.id}
            onClick={() => {
              setEquipmentId(item.id);
              resetSelection();
              setError("");
              setSuccess("");
            }}
            type="button"
          >
            {item.name}
          </button>
        ))}
      </div>

      <section className="rounded-[10px] border border-[#dce4e8] bg-white p-3 shadow-[0_2px_8px_rgba(20,33,42,0.04)]">
        <div className="flex items-center justify-between">
          <button
            aria-label="Өмнөх сар"
            className="rounded bg-[#f0f4f6] px-2.5 py-1 disabled:opacity-30"
            disabled={!canGoBack}
            onClick={() => changeMonth(-1)}
            type="button"
          >
            ‹
          </button>
          <div className="text-center">
            <p className="font-['Inter:Bold'] text-[12px] font-bold">
              {year} оны {Number(monthNumber)}-р сар
            </p>
            <p className="mt-0.5 text-[9px] text-[#7c8a93]">
              {loading
                ? "Ачаалж байна…"
                : ready
                  ? `${freeCount} сул өдөр`
                  : "Сул өдрийн мэдээлэл ачаалж чадсангүй"}
            </p>
          </div>
          <button
            aria-label="Дараагийн сар"
            className="rounded bg-[#f0f4f6] px-2.5 py-1"
            onClick={() => changeMonth(1)}
            type="button"
          >
            ›
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1">
          {weekdays.map((day) => (
            <span className="text-center text-[7px] font-bold text-[#8a99a3]" key={day}>
              {day}
            </span>
          ))}
          {cells.map((key, index) => {
            if (!key) return <span key={`empty-${index}`} />;
            const state: DayState = ready ? stateOf(key) : "past";
            const chosen = inSelection(key);
            const isEdge = key === start || key === rangeEnd;
            return (
              <button
                aria-label={`${formatDay(key)}: ${
                  state === "free" ? "сул" : state === "past" ? "өнгөрсөн" : "захиалагдсан"
                }`}
                aria-pressed={chosen}
                className={`h-9 rounded-lg text-center font-['Roboto_Mono:Bold'] text-[11px] font-bold transition-colors ${
                  chosen
                    ? isEdge
                      ? "bg-[#1677a8] text-white"
                      : "bg-[#9fd0e6] text-[#0f4f70]"
                    : dayStyles[state]
                } ${key === today ? "underline decoration-2 underline-offset-2" : ""}`}
                disabled={!ready || loading || state !== "free"}
                key={key}
                onClick={() => pickDay(key)}
                type="button"
              >
                {Number(key.slice(8))}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-[8px] text-[#6c7c87]">
          {[
            ["bg-[#e3f3ec]", "Сул"],
            ["bg-[#fbe7e5]", "Захиалагдсан"],
            ["bg-[#e2f1f7] ring-1 ring-[#1677a8]", "Таны захиалга"],
            ["bg-[#1677a8]", "Сонгосон"],
          ].map(([color, label]) => (
            <span className="flex items-center gap-1" key={label}>
              <span className={`size-2.5 rounded ${color}`} />
              {label}
            </span>
          ))}
        </div>
      </section>

      {error && (
        <p className="rounded-lg border border-[#e7847e] bg-[#fff3f2] p-3 text-[10px] text-[#a6372f]" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-[#9fd3bb] bg-[#eef8f3] p-3 text-[10px] text-[#1d6f4f]" role="status">
          ✓ {success}
        </p>
      )}

      <section className="rounded-[10px] border border-[#dce4e8] bg-white p-3">
        <div className="flex items-center justify-between">
          <h2 className="font-['Inter:Bold'] text-[11px] font-bold">Сонгосон хугацаа</h2>
          {start && rangeEnd && (
            <span className="rounded-full bg-[#e3f3ec] px-2 py-1 text-[9px] font-bold text-[#238a62]">
              {daysBetween(start, rangeEnd)} өдөр
            </span>
          )}
        </div>
        {start && rangeEnd ? (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-[#f3f7f8] p-3">
            <div>
              <p className="text-[8px] text-[#7c8992]">ЭХЛЭХ</p>
              <p className="font-['Roboto_Mono:Bold'] text-[12px] font-bold">{start}</p>
            </div>
            <span className="text-[#1677a8]">→</span>
            <div className="text-right">
              <p className="text-[8px] text-[#7c8992]">ДУУСАХ</p>
              <p className="font-['Roboto_Mono:Bold'] text-[12px] font-bold">{rangeEnd}</p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-[10px] text-[#7c8a93]">
            Хуанли дээрээс ногоон (сул) өдрөө сонгоно уу. Эхлэх, дуусах өдрөө дарахад
            хугацаа сонгогдоно.
          </p>
        )}
        <textarea
          className="mt-3 w-full resize-none rounded-lg border border-[#dce4e8] p-3 text-[10px] outline-none focus:border-[#1677a8]"
          maxLength={500}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Ажлын байршил, тэмдэглэл (заавал биш)"
          rows={2}
          value={note}
        />
      </section>

      <button
        className="h-[48px] rounded-[9px] bg-[#1677a8] font-['Inter:Bold'] text-[12px] font-bold text-white disabled:bg-[#a9c7d6]"
        disabled={!start || submitting}
        onClick={() => void confirm()}
        type="button"
      >
        {submitting ? "Илгээж байна…" : "Захиалга баталгаажуулах"}
      </button>

      {myForEquipment.length > 0 && (
        <section className="rounded-[10px] border border-[#dce4e8] bg-white">
          <h2 className="border-b border-[#e4eaed] p-3 font-['Inter:Bold'] text-[11px] font-bold">
            Энэ төхөөрөмжийн миний захиалгууд
          </h2>
          {myForEquipment.map((item) => (
            <div
              className="flex items-center justify-between gap-2 border-b border-[#edf1f3] p-3 last:border-0"
              key={item.id}
            >
              <div>
                <p className="font-['Roboto_Mono:Bold'] text-[11px] font-bold">
                  {item.startDate} → {item.endDate}
                </p>
                <p className="mt-0.5 text-[9px] text-[#7c8a93]">
                  {daysBetween(item.startDate, item.endDate)} өдөр
                  {item.note ? ` · ${item.note}` : ""}
                </p>
              </div>
              {today && item.startDate > today && (
                <button
                  className="rounded-full border border-[#e7847e] px-2.5 py-1 text-[9px] font-bold text-[#c0473f]"
                  onClick={() => void cancel(item.id)}
                  type="button"
                >
                  Цуцлах
                </button>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
