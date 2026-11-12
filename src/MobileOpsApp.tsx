import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type DashboardResponse, type UserRole } from "./lib/api";
import LiveSiteMonitor from "./LiveSiteMonitor";
import MobileLogin from "./MobileLogin";

const assetPathPrefix = "/assets";
const icons = {
  home: `${assetPathPrefix}/926bd.svg`,
  truck: `${assetPathPrefix}/82b68.svg`,
  calendar: `${assetPathPrefix}/a20d8.svg`,
  qr: `${assetPathPrefix}/30ac3.svg`,
  bell: `${assetPathPrefix}/f921d.svg`,
  back: `${assetPathPrefix}/50281.svg`,
  chevron: `${assetPathPrefix}/7163e.svg`,
  alert: `${assetPathPrefix}/6f009.svg`,
  activity: `${assetPathPrefix}/39c87.svg`,
  shield: `${assetPathPrefix}/afd3d.svg`,
  mapPin: `${assetPathPrefix}/1f59f.svg`,
  check: `${assetPathPrefix}/10787.svg`,
  send: `${assetPathPrefix}/ac877.svg`,
  phone: `${assetPathPrefix}/8c0be.svg`,
};

const equipmentPhoto = `${assetPathPrefix}/1cab8.png`;
const equipmentRearPhoto = `${assetPathPrefix}/bb5fa.png`;

type Screen =
  | "login"
  | "home"
  | "equipment"
  | "detail"
  | "calendar"
  | "scanner"
  | "checkout"
  | "checkin"
  | "telemetry"
  | "anomaly"
  | "support"
  | "notifications";

const screenIds: Screen[] = [
  "login",
  "home",
  "equipment",
  "detail",
  "calendar",
  "scanner",
  "checkout",
  "checkin",
  "telemetry",
  "anomaly",
  "support",
  "notifications",
];

const fallbackDashboard: DashboardResponse = {
  summary: {
    totalEquipment: 128,
    rentedToday: 6,
    alerts: 4,
    syncSecondsAgo: "8 сек өмнө",
    siteName: "Улаанбаатар төв",
  },
  equipment: [
    { id: "DRL-UB-0247", name: "Өрмийн машин D45", model: "Atlas Copco D45", status: "Түрээстэй", meta: "DRL-UB-0247", location: "Нарны зам · Блок B", assignee: "Б. Бат", tenant: "Хөх Тэнгэр ХХК", due: "10-р сарын 18", telemetry: { vibration: "4.82", temperature: "78.6", rpm: "1,482" }, live: true },
    { id: "GEN-0162", name: "Генератор 150 кВА", model: "Cummins 150 kVA", status: "Бэлэн", meta: "GEN-0162", location: "Зүүн талбай · Хашаа 2", assignee: "С. Уран", tenant: "Монкон ХХК", due: "10-р сарын 14", telemetry: { vibration: "2.58", temperature: "64.2", rpm: "840" }, live: true },
    { id: "MIX-4993", name: "Бетон зуурагч 8м³", model: "MIX-8 PRO", status: "Анхаарах", meta: "MIX-4993", location: "Талбай 12 · Блок C", assignee: "Н. Баяр", tenant: "Улаанбаатар бетон", due: "10-р сарын 16", telemetry: { vibration: "8.41", temperature: "96.2", rpm: "1,824" }, live: true },
  ],
  alerts: [
    {
      id: "A-8842",
      title: "Бетон зуурагчийн температур",
      equipmentId: "MIX-4993",
      risk: "93.4%",
      location: "Талбай 12",
      severity: "high",
      description: "Температур 96.2°C · автомат мониторинг идэвхтэй",
    },
  ],
  notifications: [
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
  ],
  supportTeam: [
    { name: "Д. Эрдэнэ", role: "Техникч · 7 мин" },
    { name: "С. Номин", role: "Менежер · ONLINE" },
  ],
};

function getScreenFromHash(): Screen {
  const hash = window.location.hash.replace(/^#\/?/, "") as Screen;
  return screenIds.includes(hash) ? hash : "login";
}

const equipment = [
  { name: "Өрмийн машин D45", meta: "DRL-UB-0247", status: "Түрээстэй" },
  { name: "Генератор 150 кВА", meta: "GEN-0162", status: "Бэлэн" },
  { name: "Бетон зуурагч 8м³", meta: "MIX-4993", status: "Анхаарах" },
  { name: "Бага оврын экскаватор", meta: "EXC-0914", status: "Засварт" },
  { name: "Гар багаж / багц", meta: "TLS-1318", status: "Бэлэн" },
];

function Icon({
  src,
  className = "size-4",
}: {
  src: string;
  className?: string;
}) {
  return <img alt="" className={className} src={src} />;
}

function Header({
  title,
  subtitle,
  onBack,
  action,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 flex min-h-[60px] items-center gap-3 border-b border-[#dce4e8] bg-white px-4 py-3">
      {onBack && (
        <button
          aria-label="Буцах"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f2f5f7]"
          onClick={onBack}
          type="button"
        >
          <Icon src={icons.back} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-['Inter:Bold'] text-[16px] font-bold text-[#14212a]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 truncate font-['Inter:Regular'] text-[9px] text-[#7b8a94]">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}

function BottomNav({
  current,
  onNavigate,
}: {
  current: Screen;
  onNavigate: (screen: Screen) => void;
}) {
  const items: { id: Screen; label: string; icon: string }[] = [
    { id: "home", label: "Нүүр", icon: icons.home },
    { id: "equipment", label: "Төхөөрөмж", icon: icons.truck },
    { id: "scanner", label: "QR", icon: icons.qr },
    { id: "notifications", label: "Мэдэгдэл", icon: icons.bell },
  ];

  return (
    <nav className="sticky bottom-0 z-20 grid h-[66px] grid-cols-4 border-t border-[#dce4e8] bg-white px-2">
      {items.map((item) => {
        const active =
          current === item.id ||
          (item.id === "equipment" &&
            ["detail", "checkout", "checkin", "calendar"].includes(current));

        return (
          <button
            className={`flex flex-col items-center justify-center gap-1 rounded-lg font-['Inter:Regular'] text-[9px] ${
              active ? "bg-[#e8f4f9] text-[#1677a8]" : "text-[#7b8a94]"
            }`}
            key={item.id}
            onClick={() => onNavigate(item.id)}
            type="button"
          >
            <Icon className="size-[18px]" src={item.icon} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function MobilePage({
  children,
  current,
  onNavigate,
}: {
  children: ReactNode;
  current: Screen;
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <main className="flex min-h-dvh w-full flex-col bg-[#eef2f4] font-['Inter:Regular'] text-[#14212a]">
      <div className="flex flex-1 flex-col">{children}</div>
      <BottomNav current={current} onNavigate={onNavigate} />
    </main>
  );
}

function StatusPill({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: "green" | "blue" | "orange" | "red" | "gray";
}) {
  const colors = {
    green: "bg-[#e3f3ec] text-[#238a62]",
    blue: "bg-[#e2f1f7] text-[#1677a8]",
    orange: "bg-[#fff2dd] text-[#bd7111]",
    red: "bg-[#fbe7e5] text-[#d8463e]",
    gray: "bg-[#edf1f3] text-[#687985]",
  };

  return (
    <span
      className={`rounded-full px-2 py-1 font-['Inter:Bold'] text-[9px] font-bold whitespace-nowrap ${colors[tone]}`}
    >
      {children}
    </span>
  );
}

function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[10px] border border-[#dce4e8] bg-white shadow-[0_2px_8px_rgba(20,33,42,0.04)] ${className}`}
    >
      {children}
    </section>
  );
}

function HomeScreen({
  dashboard,
  onNavigate,
  onSignOut,
  onBackToWebsite,
  role,
}: {
  dashboard: DashboardResponse;
  onNavigate: (screen: Screen) => void;
  onSignOut: () => void;
  onBackToWebsite?: () => void;
  role: UserRole;
}) {
  const summary = dashboard.summary;
  const roleLabel =
    role === "admin"
      ? "Админ"
      : role === "manager"
        ? "Менежер"
        : role === "fixer"
          ? "Фиксер"
          : "Түрээслэгч";
  const roleGreeting =
    role === "admin"
      ? "Админы самбар"
      : role === "manager"
        ? "Тайлангийн тойм"
        : role === "fixer"
          ? "Ажлын тасалбар"
          : "Түрээслэх бүртгэл";

  return (
    <MobilePage current="home" onNavigate={onNavigate}>
      <Header
        action={
          <div className="flex items-center gap-2">
            <button
              className="rounded-full border border-[#dce4e8] bg-[#f8fafb] px-2 py-1 font-['Inter:Bold'] text-[9px] font-bold text-[#42515d]"
              onClick={() => onNavigate("home")}
              type="button"
            >
              Буцах
            </button>
            {onBackToWebsite && (
              <button
                className="rounded-full border border-[#dce4e8] bg-[#edf7ff] px-2 py-1 font-['Inter:Bold'] text-[9px] font-bold text-[#1677a8]"
                onClick={onBackToWebsite}
                type="button"
              >
                Website
              </button>
            )}
            <button
              className="rounded-full border border-[#dce4e8] bg-[#f3f7f8] px-2 py-1 font-['Inter:Bold'] text-[9px] font-bold text-[#42515d]"
              onClick={onSignOut}
              type="button"
            >
              Гарах
            </button>
            <button
              className="relative flex size-9 items-center justify-center rounded-full bg-[#f2f5f7]"
              onClick={() => onNavigate("notifications")}
              type="button"
            >
              <Icon src={icons.bell} />
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-[#df453e]" />
            </button>
          </div>
        }
        subtitle="2026.10.04 · Талбай 12"
        title={`Өглөөний мэнд, ${roleLabel}`}
      />
      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            [String(summary.rentedToday), "Түрээстэй"],
            [String(summary.totalEquipment), "Нийт"],
            [String(summary.alerts), "Анхаарах"],
          ].map(([value, label], index) => (
            <Card
              className={`p-3 ${index === 2 ? "border-[#e98b86] bg-[#fff3f2]" : ""}`}
              key={label}
            >
              <p className="font-['Roboto_Mono:Bold'] text-[22px] font-bold">
                {value}
              </p>
              <p className="mt-1 text-[9px] text-[#6c7c87]">{label}</p>
            </Card>
          ))}
        </div>

        {role !== "renter" && (
          <LiveSiteMonitor equipment={dashboard.equipment} />
        )}

        <button
          className="rounded-[10px] border border-[#e7847e] bg-[#fff3f2] p-3 text-left"
          onClick={() => onNavigate("anomaly")}
          type="button"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-[#d8463e]">
              <Icon className="size-5 brightness-0 invert" src={icons.alert} />
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-['Inter:Bold'] text-[12px] font-bold">
                  {dashboard.alerts[0]?.title ?? "Бетон зуурагчийн температур"}
                </p>
                <span className="font-['Roboto_Mono:Bold'] text-[11px] font-bold text-[#d8463e]">
                  {dashboard.alerts[0]?.risk ?? "93.4%"}
                </span>
              </div>
              <p className="mt-1 text-[9px] text-[#8a5c59]">
                {dashboard.alerts[0]?.equipmentId ?? "MIX-4993"} · {dashboard.alerts[0]?.description ?? "96.2°C · Талбай 12"}
              </p>
            </div>
          </div>
        </button>

        <Card>
          <div className="flex items-center justify-between border-b border-[#e4eaed] p-3">
            <h2 className="font-['Inter:Bold'] text-[12px] font-bold">
              Дараагийн ажлууд
            </h2>
            <span className="text-[9px] text-[#7c8a93]">3 ажил</span>
          </div>
          {[
            ["13:10", "Генератор check-out", "Өнөөдөр"],
            ["14:30", "Өрмийн машин буцаалт", "Хүлээгдэж"],
            ["16:00", "Багаж шалгах", "Дараа"],
          ].map(([time, title, state]) => (
            <div
              className="flex items-center gap-3 border-b border-[#edf1f3] p-3 last:border-0"
              key={time}
            >
              <span className="font-['Roboto_Mono:Bold'] text-[11px] font-bold">
                {time}
              </span>
              <p className="flex-1 text-[11px]">{title}</p>
              <span className="text-[8px] text-[#758690]">{state}</span>
            </div>
          ))}
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <button
            className="flex h-[64px] items-center gap-3 rounded-[10px] bg-[#e2f1f7] p-3 text-left"
            onClick={() => onNavigate(role === "fixer" ? "scanner" : "equipment")}
            type="button"
          >
            <Icon className="size-6" src={icons.qr} />
            <span className="font-['Inter:Bold'] text-[11px] font-bold">
              {role === "fixer" ? "QR уншуулах" : "Төхөөрөмжийн жагсаалт"}
            </span>
          </button>
          <button
            className="flex h-[64px] items-center gap-3 rounded-[10px] bg-white p-3 text-left"
            onClick={() => onNavigate(role === "fixer" ? "support" : "notifications")}
            type="button"
          >
            <Icon className="size-6" src={icons.send} />
            <span className="font-['Inter:Bold'] text-[11px] font-bold">
              {role === "fixer" ? "Тусламж" : "Мэдэгдэл"}
            </span>
          </button>
        </div>

        <div className="rounded-[10px] border border-[#dce4e8] bg-white p-3">
          <p className="font-['Inter:Bold'] text-[10px] font-bold text-[#6c7c87]">
            {roleGreeting}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-['Inter:Bold'] text-[12px] font-bold text-[#14212a]">
              {role === "admin"
                ? "Хэрэглэгч, түрээс, тайлангийн удирдлага"
                : role === "manager"
                  ? "Бүртгэл, тайлан, даалгавар"
                  : role === "fixer"
                    ? "Засвар, QR, telemetry"
                    : "Гэрээ, төлбөр, түрээсийн хяналт"}
            </span>
            <button
              className="rounded-full bg-[#1677a8] px-2.5 py-1 text-[9px] font-bold text-white"
              onClick={() => onNavigate(role === "fixer" ? "detail" : "notifications")}
              type="button"
            >
              Үргэлжлүүлэх
            </button>
          </div>
        </div>
      </div>
    </MobilePage>
  );
}

function EquipmentScreen({
  dashboard,
  onNavigate,
}: {
  dashboard: DashboardResponse;
  onNavigate: (screen: Screen) => void;
}) {
  const [activeFilter, setActiveFilter] = useState<"all" | "ready" | "rented" | "alert">("all");
  const equipment = dashboard.equipment ?? fallbackDashboard.equipment;

  const filteredEquipment = useMemo(() => {
    if (activeFilter === "all") {
      return equipment;
    }

    return equipment.filter((item) => {
      if (activeFilter === "ready") {
        return item.status === "Бэлэн";
      }
      if (activeFilter === "rented") {
        return item.status === "Түрээстэй";
      }
      return item.status === "Анхаарах" || item.status === "Засварт";
    });
  }, [activeFilter, equipment]);

  return (
    <MobilePage current="equipment" onNavigate={onNavigate}>
      <Header
        onBack={() => onNavigate("home")}
        subtitle={`${dashboard.summary.totalEquipment} төхөөрөмж · 4 талбай`}
        title="Тоног төхөөрөмж"
      />
      <div className="flex gap-2 overflow-x-auto bg-white px-3 py-2">
        {[
          { id: "all", label: "Бүгд 128" },
          { id: "ready", label: "Бэлэн 30" },
          { id: "rented", label: "Түрээстэй 76" },
          { id: "alert", label: "Анхаарах 9" },
        ].map((filter) => (
          <button
            className={`rounded-full px-3 py-1.5 text-[9px] whitespace-nowrap ${
              activeFilter === filter.id
                ? "bg-[#14212a] text-white"
                : "bg-[#eef2f4] text-[#5d6e79]"
            }`}
            key={filter.id}
            onClick={() => setActiveFilter(filter.id as "all" | "ready" | "rented" | "alert")}
            type="button"
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        {filteredEquipment.map((item, index) => (
          <button
            className="flex w-full items-center gap-3 rounded-[10px] border border-[#dce4e8] bg-white p-3 text-left"
            key={item.meta}
            onClick={() => onNavigate("detail")}
            type="button"
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-[#edf6f9]">
              <Icon className="size-5" src={icons.truck} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-['Inter:Bold'] text-[11px] font-bold">
                {item.name}
              </span>
              <span className="mt-1 block font-['Roboto_Mono:Regular'] text-[8px] text-[#7b8992]">
                {item.meta}
              </span>
            </span>
            <StatusPill
              tone={
                index === 0
                  ? "blue"
                  : index === 2
                    ? "orange"
                    : index === 3
                      ? "gray"
                      : "green"
              }
            >
              {item.status}
            </StatusPill>
          </button>
        ))}
      </div>
    </MobilePage>
  );
}

function DetailScreen({
  dashboard,
  onNavigate,
}: {
  dashboard: DashboardResponse;
  onNavigate: (screen: Screen) => void;
}) {
  const primaryEquipment = dashboard.equipment[0] ?? fallbackDashboard.equipment[0];

  return (
    <MobilePage current="detail" onNavigate={onNavigate}>
      <Header
        onBack={() => onNavigate("equipment")}
        subtitle={primaryEquipment?.meta ?? "DRL-UB-0247"}
        title={primaryEquipment?.name ?? "Өрмийн машин D45"}
      />
      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="relative h-[180px] overflow-hidden rounded-[10px] bg-[#c7d2d8]">
          <img
            alt={primaryEquipment?.name ?? "Өрмийн машин D45"}
            className="h-full w-full object-cover"
            src={equipmentPhoto}
          />
          <span className="absolute bottom-3 left-3">
            <StatusPill tone="blue">ТҮРЭЭСТЭЙ</StatusPill>
          </span>
          <button
            className="absolute right-3 bottom-3 flex size-10 items-center justify-center rounded-lg bg-white"
            onClick={() => onNavigate("scanner")}
            type="button"
          >
            <Icon className="size-6" src={icons.qr} />
          </button>
        </div>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-['Roboto_Mono:Bold'] text-[15px] font-bold">
                {primaryEquipment?.meta ?? "DRL-UB-0247"}
              </p>
              <p className="mt-1 text-[9px] text-[#74838d]">
                {primaryEquipment?.model ?? "Atlas Copco D45"}
              </p>
            </div>
            <StatusPill tone={primaryEquipment?.live ? "green" : "gray"}>
              {primaryEquipment?.live ? "MQTT LIVE" : "OFFLINE"}
            </StatusPill>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#e4eaed] pt-3">
            {[
              ["Байршил", primaryEquipment?.location ?? "Нарны зам · Блок B"],
              ["Хариуцагч", primaryEquipment?.assignee ?? "Б. Бат"],
              ["Түрээслэгч", primaryEquipment?.tenant ?? "Хөх Тэнгэр ХХК"],
              ["Дуусах", primaryEquipment?.due ?? "10-р сарын 18"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[8px] text-[#82909a]">{label}</p>
                <p className="mt-1 text-[10px] font-medium">{value}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <h2 className="font-['Inter:Bold'] text-[11px] font-bold">
              Live telemetry
            </h2>
            <span className="text-[8px] text-[#20a06b]">12:48:20</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              [primaryEquipment?.telemetry.vibration ?? "4.82", "mm/s"],
              [primaryEquipment?.telemetry.temperature ?? "78.6", "°C"],
              [primaryEquipment?.telemetry.rpm ?? "1,482", "RPM"],
            ].map(([value, unit]) => (
              <div className="rounded-lg bg-[#f3f7f8] p-2" key={unit}>
                <p className="font-['Roboto_Mono:Bold'] text-[14px] font-bold text-[#1677a8]">
                  {value}
                </p>
                <p className="mt-1 text-[8px] text-[#71808a]">{unit}</p>
              </div>
            ))}
          </div>
          <button
            className="mt-3 w-full rounded-lg bg-[#edf6f9] py-2 font-['Inter:Bold'] text-[9px] font-bold text-[#1677a8]"
            onClick={() => onNavigate("telemetry")}
            type="button"
          >
            Live telemetry дэлгэрэнгүй
          </button>
        </Card>
        <button
          className="mt-auto h-[48px] rounded-[9px] bg-[#1677a8] font-['Inter:Bold'] text-[12px] font-bold text-white"
          onClick={() => onNavigate("calendar")}
          type="button"
        >
          Захиалгын хугацаа сонгох
        </button>
      </div>
    </MobilePage>
  );
}

function CalendarScreen({
  onNavigate,
}: {
  onNavigate: (screen: Screen) => void;
}) {
  const [selectedDay, setSelectedDay] = useState("09");

  return (
    <MobilePage current="calendar" onNavigate={onNavigate}>
      <Header
        onBack={() => onNavigate("detail")}
        subtitle="DRL-UB-0247 · Өрмийн машин"
        title="Захиалгын хуанли"
      />
      <div className="flex flex-1 flex-col gap-3 p-3">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <button className="rounded bg-[#f0f4f6] px-2 py-1" type="button">
              ‹
            </button>
            <p className="font-['Inter:Bold'] text-[12px] font-bold">
              2026 оны 10-р сар
            </p>
            <button className="rounded bg-[#f0f4f6] px-2 py-1" type="button">
              ›
            </button>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1">
            {["05", "06", "07", "08", "09", "10", "11"].map((day, index) => {
              const isSelected = selectedDay === day;

              return (
                <button
                  className={`rounded-lg py-3 text-center ${
                    isSelected
                      ? "bg-[#1677a8] text-white"
                      : index > 1 && index < 4
                        ? "bg-[#fff1dc] text-[#b46b0f]"
                        : "bg-[#f4f7f8]"
                  }`}
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  type="button"
                >
                  <span className="block text-[7px]">
                    {["ДАВ", "МЯГ", "ЛХА", "ПҮР", "БАА", "БЯМ", "НЯМ"][index]}
                  </span>
                  <span className="mt-1 block font-['Roboto_Mono:Bold'] text-[12px] font-bold">
                    {day}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <h2 className="font-['Inter:Bold'] text-[11px] font-bold">
              Сонгосон хугацаа
            </h2>
            <StatusPill tone="green">3 өдөр</StatusPill>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-[#f3f7f8] p-3">
            <div>
              <p className="text-[8px] text-[#7c8992]">ЭХЛЭХ</p>
              <p className="font-['Roboto_Mono:Bold'] text-[13px] font-bold">
                10.{selectedDay} · 08:00
              </p>
            </div>
            <span className="text-[#1677a8]">→</span>
            <div className="text-right">
              <p className="text-[8px] text-[#7c8992]">ДУУСАХ</p>
              <p className="font-['Roboto_Mono:Bold'] text-[13px] font-bold">
                10.{String(Number(selectedDay) + 1).padStart(2, "0")} · 18:00
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <h2 className="font-['Inter:Bold'] text-[11px] font-bold">
            Захиалгын мэдээлэл
          </h2>
          <div className="mt-3 space-y-2">
            <div className="rounded-lg border border-[#dce4e8] p-3 text-[10px]">
              Монкон ХХК · Нарны зам, Блок B
            </div>
            <div className="rounded-lg border border-[#dce4e8] p-3 text-[10px] text-[#71808a]">
              Ажлын тайлбар, тэмдэглэл...
            </div>
          </div>
        </Card>
        <button
          className="mt-auto h-[48px] rounded-[9px] bg-[#1677a8] font-['Inter:Bold'] text-[12px] font-bold text-white"
          onClick={() => onNavigate("checkout")}
          type="button"
        >
          Захиалга баталгаажуулах
        </button>
      </div>
    </MobilePage>
  );
}

function ScannerScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <MobilePage current="scanner" onNavigate={onNavigate}>
      <div className="relative flex min-h-[calc(100dvh-66px)] flex-1 flex-col overflow-hidden bg-[#0d1820] text-white">
        <Header
          action={<span className="text-[10px] text-[#9aabb4]">DRL-UB-0247</span>}
          onBack={() => onNavigate("home")}
          subtitle="Төхөөрөмжийн шошгыг хүрээнд тааруулна уу"
          title="QR код уншуулах"
        />
        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#17252d]">
          <img
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-25"
            src={equipmentRearPhoto}
          />
          <div className="relative flex aspect-square w-[58%] items-center justify-center rounded-[22px] border-2 border-white">
            <span className="h-px w-[80%] bg-[#1677a8] shadow-[0_0_14px_#3fc5ff]" />
            <span className="absolute bottom-3 rounded-full bg-black/60 px-3 py-1 text-[8px]">
              QR кодыг хүрээнд оруулна уу
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 bg-[#0d1820] p-3">
          <button
            className="h-[44px] rounded-lg bg-white text-[10px] font-bold text-[#1677a8]"
            onClick={() => onNavigate("checkout")}
            type="button"
          >
            Зураг сонгох
          </button>
          <button
            className="h-[44px] rounded-lg bg-white text-[10px] font-bold text-[#1677a8]"
            onClick={() => onNavigate("detail")}
            type="button"
          >
            ID оруулах
          </button>
        </div>
      </div>
    </MobilePage>
  );
}

function Checklist({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-[#e4eaed] p-3">
        <h2 className="font-['Inter:Bold'] text-[11px] font-bold">{title}</h2>
        <span className="text-[8px] text-[#7b8992]">
          {items.length}/{items.length}
        </span>
      </div>
      <div className="p-3">
        {items.map((item) => (
          <div className="flex items-center gap-2 py-1.5" key={item}>
            <span className="flex size-5 items-center justify-center rounded bg-[#dff3e9]">
              <Icon className="size-3" src={icons.check} />
            </span>
            <span className="flex-1 text-[10px]">{item}</span>
            <span className="text-[8px] text-[#29906b]">Хэвийн</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CheckoutScreen({
  onNavigate,
}: {
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <MobilePage current="checkout" onNavigate={onNavigate}>
      <Header
        onBack={() => onNavigate("calendar")}
        subtitle="GEN-0162 · Генератор 150 кВА"
        title="Check-out · Олголт"
      />
      <div className="flex flex-1 flex-col gap-3 p-3">
        <Card className="flex items-center gap-3 p-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-[#e2f1f7]">
            <Icon className="size-5" src={icons.truck} />
          </span>
          <div className="flex-1">
            <p className="font-['Inter:Bold'] text-[11px] font-bold">
              Генератор 150 кВА
            </p>
            <p className="mt-1 text-[8px] text-[#7b8992]">GEN-0162</p>
          </div>
          <StatusPill tone="green">QR OK</StatusPill>
        </Card>
        <Checklist
          items={[
            "Гадна их бие, будгийн",
            "Хамгаалалтын хаалт",
            "Тос, түлшний түвшин",
            "Кабель, залгуурын бүрдэл",
          ]}
          title="Төхөөрөмжийн байдлыг шалгах"
        />
        <Card className="p-3">
          <h2 className="font-['Inter:Bold'] text-[11px] font-bold">
            Олголтын зураг
          </h2>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[equipmentPhoto, equipmentRearPhoto, equipmentPhoto].map(
              (photo, index) => (
                <img
                  alt=""
                  className="aspect-square rounded-lg object-cover"
                  key={index}
                  src={photo}
                />
              ),
            )}
            <button
              className="aspect-square rounded-lg border border-dashed border-[#1677a8] bg-[#edf7fa] text-xl text-[#1677a8]"
              type="button"
            >
              +
            </button>
          </div>
        </Card>
        <Card className="p-3">
          <label className="flex items-center gap-2">
            <input className="accent-[#1677a8]" type="checkbox" />
            <span className="text-[9px]">
              Хүлээн авагчид нөхцөл, зааврыг танилцуулсан
            </span>
          </label>
        </Card>
        <button
          className="mt-auto h-[48px] rounded-[9px] bg-[#1677a8] font-['Inter:Bold'] text-[12px] font-bold text-white"
          onClick={() => onNavigate("detail")}
          type="button"
        >
          Check-out баталгаажуулах
        </button>
      </div>
    </MobilePage>
  );
}

function CheckinScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <MobilePage current="checkin" onNavigate={onNavigate}>
      <Header
        onBack={() => onNavigate("detail")}
        subtitle="DRL-UB-0247 · Өрмийн машин D45"
        title="Check-in · Буцаалт"
      />
      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="rounded-lg border border-[#f0cf94] bg-[#fff4df] p-3">
          <div className="flex items-center justify-between">
            <p className="font-['Inter:Bold'] text-[11px] font-bold">
              Буцаалт 18 мин хоцорсон
            </p>
            <StatusPill tone="orange">ШАЛГАХ</StatusPill>
          </div>
        </div>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <h2 className="font-['Inter:Bold'] text-[11px] font-bold">
              Зургийн харьцуулалт
            </h2>
            <span className="text-[8px] text-[#7b8992]">AI 96%</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <img
                alt=""
                className="aspect-[4/3] w-full rounded-lg object-cover"
                src={equipmentPhoto}
              />
              <p className="mt-1 text-[8px]">Олголтын зураг</p>
            </div>
            <div>
              <img
                alt=""
                className="aspect-[4/3] w-full rounded-lg border-2 border-[#e0a137] object-cover"
                src={equipmentRearPhoto}
              />
              <p className="mt-1 text-[8px] text-[#c27a19]">Одоогийн зураг</p>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-[#fff4df] p-2 text-[9px] text-[#a36518]">
            Шинэ өөрчлөлт илэрсэн · баруун хэсэгт зураас
          </div>
        </Card>
        <Card className="p-3">
          <h2 className="font-['Inter:Bold'] text-[11px] font-bold">
            Эвдрэл, дутагдал
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {["Эвдрэлгүй", "Зураас", "Бусад"].map((item, index) => (
              <button
                className={`rounded-lg border p-3 text-[9px] ${
                  index === 1
                    ? "border-[#df4a43] bg-[#fff1f0] text-[#c53c36]"
                    : "border-[#dce4e8]"
                }`}
                key={item}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
          <textarea
            className="mt-3 min-h-[58px] w-full rounded-lg border border-[#dce4e8] p-3 text-[9px] outline-none"
            placeholder="Тайлбар нэмэх..."
          />
        </Card>
        <button
          className="mt-auto h-[48px] rounded-[9px] bg-[#d8463e] font-['Inter:Bold'] text-[12px] font-bold text-white"
          onClick={() => onNavigate("equipment")}
          type="button"
        >
          Буцаалт нээж, акт үүсгэх
        </button>
      </div>
    </MobilePage>
  );
}

function MiniChart({ danger = false }: { danger?: boolean }) {
  return (
    <div className="relative h-[110px] overflow-hidden rounded-lg border border-[#e2e8eb] bg-white">
      <div className="absolute inset-x-3 top-1/2 h-px bg-[#dbe3e7]" />
      <div
        className={`absolute right-4 bottom-5 left-4 h-[64px] rounded-[50%] border-b-2 ${
          danger ? "border-[#d8463e]" : "border-[#1677a8]"
        } -rotate-6`}
      />
      <div className="absolute right-4 bottom-6 left-4 h-[48px] rotate-3 rounded-[50%] border-b-2 border-[#e39732]" />
      {danger && (
        <div className="absolute top-3 bottom-3 left-[58%] w-px bg-[#d8463e]" />
      )}
    </div>
  );
}

function TelemetryScreen({
  onNavigate,
}: {
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <MobilePage current="telemetry" onNavigate={onNavigate}>
      <Header
        onBack={() => onNavigate("detail")}
        subtitle="LIVE · DRL-UB-0247 · 1 Hz"
        title="Live telemetry"
      />
      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="grid grid-cols-4 gap-2">
          {[
            ["96.2", "°C"],
            ["8.41", "mm/s"],
            ["1,824", "RPM"],
            ["184", "bar"],
          ].map(([value, unit], index) => (
            <Card className="p-2 text-center" key={unit}>
              <p
                className={`font-['Roboto_Mono:Bold'] text-[13px] font-bold ${
                  index === 0 ? "text-[#d8463e]" : "text-[#1677a8]"
                }`}
              >
                {value}
              </p>
              <p className="mt-1 text-[7px] text-[#788791]">{unit}</p>
            </Card>
          ))}
        </div>
        <Card className="p-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-['Inter:Bold'] text-[11px] font-bold">
              Сүүлийн 60 секунд
            </h2>
            <span className="text-[8px] text-[#7d8b94]">LIVE</span>
          </div>
          <MiniChart />
        </Card>
        <Card className="p-3">
          <div className="flex gap-2">
            <button className="flex-1 rounded-lg bg-[#e2f1f7] p-2 text-[9px] text-[#1677a8]">
              1D-CNN · F1 0.941
            </button>
            <button className="flex-1 rounded-lg bg-[#f1f4f6] p-2 text-[9px]">
              LSTM · F1 0.926
            </button>
          </div>
          <p className="mt-3 text-[9px]">Confidence threshold</p>
          <input
            className="mt-2 w-full accent-[#1677a8]"
            defaultValue="82"
            max="100"
            min="0"
            type="range"
          />
        </Card>
        <Card className="p-3">
          <p className="text-[9px]">Sliding-window төлөвлөгөө</p>
          <div className="mt-2 grid grid-cols-12 gap-1">
            {Array.from({ length: 24 }, (_, index) => (
              <span
                className={`h-3 rounded-sm ${
                  index > 13 ? "bg-[#d84d44]" : "bg-[#e1f0ea]"
                }`}
                key={index}
              />
            ))}
          </div>
        </Card>
        <button
          className="rounded-lg border border-[#e18883] bg-[#fff1f0] p-3 text-left text-[10px] font-bold text-[#d8463e]"
          onClick={() => onNavigate("anomaly")}
          type="button"
        >
          ANOMALY · шинэ эрсдэл илэрлээ
        </button>
      </div>
    </MobilePage>
  );
}

function AnomalyScreen({
  dashboard,
  onNavigate,
}: {
  dashboard: DashboardResponse;
  onNavigate: (screen: Screen) => void;
}) {
  const alert = dashboard.alerts[0] ?? fallbackDashboard.alerts[0];

  return (
    <MobilePage current="anomaly" onNavigate={onNavigate}>
      <Header
        onBack={() => onNavigate("home")}
        subtitle={`${alert?.equipmentId ?? "MIX-4993"} · Бетон зуурагч`}
        title="Anomaly alert"
      />
      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="rounded-[10px] border border-[#e87973] bg-[#fff0ef] p-3">
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-[#d8463e]">
              <Icon className="size-5 brightness-0 invert" src={icons.alert} />
            </span>
            <div className="flex-1">
              <p className="font-['Inter:Bold'] text-[13px] font-bold text-[#d8463e]">
                ӨНДӨР ЭРСДЭЛ
              </p>
              <p className="mt-1 text-[9px]">{alert?.title ?? "Бетон зуурагч “B4”"}</p>
            </div>
            <span className="font-['Roboto_Mono:Bold'] text-[16px] font-bold text-[#d8463e]">
              {alert?.risk ?? "93.4%"}
            </span>
          </div>
        </div>
        <Card className="p-3">
          {[
            ["Байршил", alert?.location ?? "ББ · Талбай 12"],
            ["Илэрсэн цаг", "Өнөөдөр · 12:43:18"],
            ["MQTT топик", alert?.equipmentId ?? "eq_429_788"],
          ].map(([label, value]) => (
            <div
              className="flex items-center justify-between border-b border-[#edf1f3] py-2 last:border-0"
              key={label}
            >
              <span className="text-[9px] text-[#75848e]">{label}</span>
              <span className="font-['Roboto_Mono:Regular'] text-[9px]">
                {value}
              </span>
            </div>
          ))}
        </Card>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["96.2", "°C"],
            ["8.41", "mm/s"],
            ["1,824", "RPM"],
          ].map(([value, unit], index) => (
            <Card className="p-3 text-center" key={unit}>
              <p
                className={`font-['Roboto_Mono:Bold'] text-[14px] font-bold ${
                  index === 0 ? "text-[#d8463e]" : "text-[#1677a8]"
                }`}
              >
                {value}
              </p>
              <p className="text-[8px] text-[#7b8992]">{unit}</p>
            </Card>
          ))}
        </div>
        <Card className="p-3">
          <h2 className="mb-3 font-['Inter:Bold'] text-[11px] font-bold">
            5 минутын өмнөх / дараах snapshot
          </h2>
          <MiniChart danger />
        </Card>
        <Card className="flex items-center justify-between p-3">
          <div>
            <p className="text-[9px] text-[#75848e]">Push/SMS мэдээлэл</p>
            <p className="mt-1 font-['Roboto_Mono:Bold'] text-[18px] font-bold text-[#238a62]">
              7.4 сек
            </p>
          </div>
          <StatusPill tone="green">SLA OK</StatusPill>
        </Card>
        <button
          className="mt-auto h-[48px] rounded-[9px] bg-[#d8463e] font-['Inter:Bold'] text-[12px] font-bold text-white"
          onClick={() => onNavigate("support")}
          type="button"
        >
          Хариу арга хэмжээ авах
        </button>
      </div>
    </MobilePage>
  );
}

function SupportScreen({
  dashboard,
  onNavigate,
}: {
  dashboard: DashboardResponse;
  onNavigate: (screen: Screen) => void;
}) {
  const supportTeam = dashboard.supportTeam ?? fallbackDashboard.supportTeam;
  const [isRequestSent, setIsRequestSent] = useState(false);

  const handleSupportRequest = async () => {
    try {
      await api.sendSupportRequest({
        message: "Яаралтай засвар, түгшүүртэй төхөөрөмжийн хяналт шаардлагатай",
        team: "tech-support",
      });
      setIsRequestSent(true);
    } catch {
      setIsRequestSent(false);
    }
  };

  return (
    <MobilePage current="support" onNavigate={onNavigate}>
      <Header
        onBack={() => onNavigate("anomaly")}
        subtitle="INCIDENT #A-8842"
        title="Тусламжийн хүсэлт"
      />
      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="rounded-[10px] bg-[#101c25] p-4 text-white">
          <p className="text-[9px] text-[#91a0aa]">Яаралтай тусламж</p>
          <h2 className="mt-1 font-['Inter:Bold'] text-[15px] font-bold">
            Техникч, менежерт хүсэлт илгээх
          </h2>
          <div className="mt-3 flex gap-2">
            <StatusPill tone="blue">#4298</StatusPill>
            <StatusPill tone="gray">ӨНДӨР</StatusPill>
            <StatusPill tone="green">MQTT ONLINE</StatusPill>
          </div>
        </div>
        <button
          className="flex h-[52px] items-center justify-center gap-2 rounded-[10px] bg-[#d8463e] font-['Inter:Bold'] text-[11px] font-bold text-white"
          onClick={handleSupportRequest}
          type="button"
        >
          <Icon className="size-5 brightness-0 invert" src={icons.send} />
          {isRequestSent ? "Тусламж илгээгдлээ" : "Техникч, менежерт тусламж илгээх"}
        </button>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <h2 className="font-['Inter:Bold'] text-[11px] font-bold">
              Хариу өгөх баг
            </h2>
            <span className="text-[8px] text-[#7b8992]">2 хүн</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {supportTeam.map((member, index) => (
              <div className="rounded-lg bg-[#f3f7f8] p-3" key={member.name}>
                <span
                  className={`mb-2 flex size-8 items-center justify-center rounded-full ${
                    index ? "bg-[#dff3e9]" : "bg-[#e2f1f7]"
                  }`}
                >
                  <Icon src={index ? icons.phone : icons.shield} />
                </span>
                <p className="text-[10px] font-bold">{member.name}</p>
                <p className="mt-1 text-[8px] text-[#74838d]">{member.role}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-3">
          <h2 className="font-['Inter:Bold'] text-[11px] font-bold">
            Хүсэлтийн явц
          </h2>
          <div className="mt-3 space-y-3">
            {[
              ["12:43", "AI anomaly илрүүлсэн"],
              ["12:44", "Push / SMS илгээгдсэн"],
              ["12:46", "Менежер хүлээн авсан"],
              ["12:48", "Техникч замд гарсан"],
            ].map(([time, event], index) => (
              <div className="flex gap-3" key={time}>
                <div className="flex flex-col items-center">
                  <span
                    className={`size-2 rounded-full ${
                      index === 3 ? "bg-[#1677a8]" : "bg-[#25a16d]"
                    }`}
                  />
                  {index < 3 && <span className="h-7 w-px bg-[#cbd6dc]" />}
                </div>
                <span className="w-10 font-['Roboto_Mono:Regular'] text-[8px] text-[#74838d]">
                  {time}
                </span>
                <span className="text-[9px]">{event}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="mt-auto p-3">
          <div className="flex items-center justify-between text-[9px]">
            <span>Илгээсэн байршил</span>
            <span className="font-['Roboto_Mono:Regular']">
              47.9184, 106.9177
            </span>
          </div>
        </Card>
      </div>
    </MobilePage>
  );
}

function NotificationsScreen({
  dashboard,
  onNavigate,
}: {
  dashboard: DashboardResponse;
  onNavigate: (screen: Screen) => void;
}) {
  const [activeTab, setActiveTab] = useState<"alerts" | "history">("alerts");
  const notifications = dashboard.notifications ?? fallbackDashboard.notifications;

  return (
    <MobilePage current="notifications" onNavigate={onNavigate}>
      <Header
        onBack={() => onNavigate("home")}
        subtitle={`${notifications.length} мэдэгдэл · 2 шинэ`}
        title="Мэдэгдэл ба түүх"
      />
      <div className="grid grid-cols-2 bg-white p-2">
        <button
          className={`rounded-lg py-2 text-[9px] ${
            activeTab === "alerts" ? "bg-[#e2f1f7] text-[#1677a8]" : "text-[#74838d]"
          }`}
          onClick={() => setActiveTab("alerts")}
          type="button"
        >
          Мэдэгдэл · 7
        </button>
        <button
          className={`py-2 text-[9px] ${
            activeTab === "history" ? "bg-[#eef2f4] text-[#14212a]" : "text-[#74838d]"
          }`}
          onClick={() => setActiveTab("history")}
          type="button"
        >
          Түрээсийн түүх
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3">
        {activeTab === "history" ? (
          <Card>
            {[
              ["Өрмийн машин D45", "Захиалга батлагдсан", "blue"],
              ["Check-out амжилттай", "Өнөөдөр · 09:28", "green"],
              ["Менежер баталсан", "Өнөөдөр · 11:41", "green"],
              ["Check-in хугацаа ойртлоо", "Өнөөдөр · 12:46", "orange"],
            ].map(([title, meta, tone], index) => (
              <button
                className="flex w-full items-start gap-3 border-b border-[#edf1f3] p-3 text-left last:border-0"
                key={title}
                onClick={() =>
                  index === 0 ? onNavigate("detail") : index === 3 ? onNavigate("checkin") : undefined
                }
                type="button"
              >
                <span
                  className={`mt-1 size-2 shrink-0 rounded-full ${
                    tone === "green"
                      ? "bg-[#25a16d]"
                      : tone === "orange"
                        ? "bg-[#e2a13b]"
                        : "bg-[#1677a8]"
                  }`}
                />
                <span className="flex-1">
                  <span className="block text-[10px] font-bold">{title}</span>
                  <span className="mt-1 block text-[8px] text-[#798791]">{meta}</span>
                </span>
                <Icon className="mt-1 size-3" src={icons.chevron} />
              </button>
            ))}
          </Card>
        ) : (
          <>
            <div>
              <p className="mb-2 text-[9px] font-bold text-[#6d7d87]">Өнөөдөр</p>
              {notifications.slice(0, 2).map((item) => (
                <button
                  className="mb-2 flex w-full gap-3 rounded-[10px] border border-[#e98781] bg-[#fff1f0] p-3 text-left last:mb-0"
                  key={item.id}
                  onClick={() => onNavigate(item.type === "alert" ? "anomaly" : "detail")}
                  type="button"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-[#d8463e]">
                    <Icon
                      className="size-5 brightness-0 invert"
                      src={item.type === "calendar" ? icons.calendar : icons.alert}
                    />
                  </span>
                  <span className="flex-1">
                    <span className="block text-[10px] font-bold">{item.title}</span>
                    <span className="mt-1 block text-[8px] text-[#8a5b58]">{item.meta}</span>
                  </span>
                </button>
              ))}
            </div>

            <div>
              <p className="mb-2 text-[9px] font-bold text-[#6d7d87]">Түрээсийн үйл явц</p>
              <Card>
                {[
                  ["Өрмийн машин D45", "Захиалга батлагдсан", "blue"],
                  ["Check-out амжилттай", "Өнөөдөр · 09:28", "green"],
                  ["Менежер баталсан", "Өнөөдөр · 11:41", "green"],
                  ["Check-in хугацаа ойртлоо", "Өнөөдөр · 12:46", "orange"],
                ].map(([title, meta, tone], index) => (
                  <button
                    className="flex w-full items-start gap-3 border-b border-[#edf1f3] p-3 text-left last:border-0"
                    key={title}
                    onClick={() =>
                      index === 0 ? onNavigate("detail") : index === 3 ? onNavigate("checkin") : undefined
                    }
                    type="button"
                  >
                    <span
                      className={`mt-1 size-2 shrink-0 rounded-full ${
                        tone === "green"
                          ? "bg-[#25a16d]"
                          : tone === "orange"
                            ? "bg-[#e2a13b]"
                            : "bg-[#1677a8]"
                      }`}
                    />
                    <span className="flex-1">
                      <span className="block text-[10px] font-bold">{title}</span>
                      <span className="mt-1 block text-[8px] text-[#798791]">{meta}</span>
                    </span>
                    <Icon className="mt-1 size-3" src={icons.chevron} />
                  </button>
                ))}
              </Card>
            </div>

            <div>
              <p className="mb-2 text-[9px] font-bold text-[#6d7d87]">Системийн төлөв</p>
              <Card>
                {[
                  ["Гар багаж / багц", "Бэлэн"],
                  ["Дизель насос 25к", "Анхаарах"],
                ].map(([title, status], index) => (
                  <div
                    className="flex items-center gap-3 border-b border-[#edf1f3] p-3 last:border-0"
                    key={title}
                  >
                    <Icon className="size-4" src={icons.truck} />
                    <span className="flex-1 text-[10px]">{title}</span>
                    <StatusPill tone={index ? "orange" : "green"}>{status}</StatusPill>
                  </div>
                ))}
              </Card>
            </div>
          </>
        )}
      </div>
    </MobilePage>
  );
}

export default function MobileOpsApp({
  onBackToWebsite,
}: {
  onBackToWebsite?: () => void;
} = {}) {
  const [screen, setScreen] = useState<Screen>(getScreenFromHash);
  const [session, setSession] = useState<{
    message: string;
    user: {
      id: string;
      role: UserRole;
      email: string;
      phone: string;
      name: string;
      company: string;
    };
    session: {
      token: string;
      role: UserRole;
      expiresAt: string;
    };
  } | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse>(fallbackDashboard);

  useEffect(() => {
    const handleHashChange = () => setScreen(getScreenFromHash());

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    let isMounted = true;

    api
      .getDashboard()
      .then((data) => {
        if (isMounted) {
          setDashboard(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setDashboard(fallbackDashboard);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session]);

  const navigate = (nextScreen: Screen) => {
    if (nextScreen === screen) {
      return;
    }

    window.location.hash = nextScreen;
    setScreen(nextScreen);
  };

  const handleLogin = (result: {
    message: string;
    user: {
      id: string;
      role: UserRole;
      email: string;
      phone: string;
      name: string;
      company: string;
    };
    session: {
      token: string;
      role: UserRole;
      expiresAt: string;
    };
  }) => {
    setSession(result);
    navigate("home");
  };

  const handleSignOut = () => {
    void api.logout().catch((error) => {
      console.error("Could not revoke session:", error);
    });
    setSession(null);
    setDashboard(fallbackDashboard);
    window.location.hash = "login";
    setScreen("login");
  };

  if (screen === "login") {
    return <MobileLogin onLogin={handleLogin} />;
  }

  const screens: Record<Exclude<Screen, "login">, ReactNode> = {
    home: (
      <HomeScreen
        dashboard={dashboard}
        onBackToWebsite={onBackToWebsite}
        onNavigate={navigate}
        onSignOut={handleSignOut}
        role={session?.user.role ?? "manager"}
      />
    ),
    equipment: <EquipmentScreen dashboard={dashboard} onNavigate={navigate} />,
    detail: <DetailScreen dashboard={dashboard} onNavigate={navigate} />,
    calendar: <CalendarScreen onNavigate={navigate} />,
    scanner: <ScannerScreen onNavigate={navigate} />,
    checkout: <CheckoutScreen onNavigate={navigate} />,
    checkin: <CheckinScreen onNavigate={navigate} />,
    telemetry: <TelemetryScreen onNavigate={navigate} />,
    anomaly: <AnomalyScreen dashboard={dashboard} onNavigate={navigate} />,
    support: <SupportScreen dashboard={dashboard} onNavigate={navigate} />,
    notifications: <NotificationsScreen dashboard={dashboard} onNavigate={navigate} />,
  };

  return screens[screen];
}
