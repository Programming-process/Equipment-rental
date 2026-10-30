import { useState } from "react";
import MobileOpsApp from "./MobileOpsApp";

const fleet = [
  {
    title: "Өрмийн машин D45",
    detail: "Хүнд нөхцөлд өрөмдлөгийн ажил гүйцэтгэнэ",
    image: "/assets/1cab8.png",
    badge: "Түрээстэй",
    price: "Үнийн санал",
  },
  {
    title: "Өрмийн машин Terra-Bore R150",
    detail: "Талбайн хүнд даацын өрөмдлөгийн ажилд",
    image: "/assets/bb5fa.png",
    badge: "Бэлэн",
    price: "Үнийн санал",
  },
  {
    title: "Генератор 150 кВА",
    detail: "Талбайн цахилгаан хангамжид тохиромжтой",
    image: "/assets/generator-150kva.jpg",
    badge: "Бэлэн",
    price: "Үнийн санал",
  },
  {
    title: "Бетон зуурагч 8м³",
    detail: "Бетон зуурмагийг талбайд жигд бэлтгэнэ",
    image: "/assets/concrete-mixer-8m3.jpg",
    badge: "Анхаарах",
    price: "Үнийн санал",
  },
  {
    title: "Бага оврын экскаватор",
    detail: "Нарийн зайд ухах, тэгшлэх ажилд зориулагдсан",
    image: "/assets/mini-excavator.jpg",
    badge: "Засварт",
    price: "Үнийн санал",
  },
  {
    title: "Гар багаж / багц",
    detail: "Өдөр тутмын угсралт, засварын ажилд",
    image:
      "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=900&q=80",
    badge: "Бэлэн",
    price: "Үнийн санал",
  },
];

const categories = [
  { name: "Тракторын төрөл", value: "38" },
  { name: "Өндөрт ажиллах машин", value: "21" },
  { name: "Генератор", value: "17" },
  { name: "Бетоны хэрэгсэл", value: "12" },
];

const stats = [
  { label: "Паркийн машин", value: "350+" },
  { label: "Цаг тухайд нь хүргэлт", value: "98.4%" },
  { label: "Дэмжлэгийн баг", value: "24/7" },
];

export default function App() {
  const [route, setRoute] = useState<"dashboard" | "mobile">("dashboard");

  if (route === "mobile") {
    return <MobileOpsApp onBackToWebsite={() => setRoute("dashboard")} />;
  }

  return (
    <div className="min-h-screen bg-[#f3f1ec] text-[#101820]">
      <header className="mx-auto max-w-7xl px-4 pt-5">
        <div className="flex items-center justify-between rounded-full bg-[#0a0d12] px-5 py-3 text-white shadow-[0_18px_40px_rgba(10,13,18,0.18)]">
          <div className="flex items-center gap-3">
            <div className="text-3xl font-black tracking-[-0.08em]">
              Rent<span className="ml-1 inline-block h-2.5 w-2.5 rounded-full bg-[#8ec5ff] align-top" />
            </div>
          </div>

          <nav className="hidden items-center gap-7 text-sm text-slate-200 md:flex">
            <button className="transition hover:text-white" type="button">Паркууд</button>
            <button className="transition hover:text-white" type="button">Тоног төхөөрөмж</button>
            <button className="transition hover:text-white" type="button">Үйлчилгээ</button>
            <button className="transition hover:text-white" type="button">Дэмжлэг</button>
          </nav>

          <div className="flex items-center gap-2">
            <button
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
              onClick={() => setRoute("dashboard")}
              type="button"
            >
              Вэбсайт
            </button>
            <button
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
              onClick={() => setRoute("mobile")}
              type="button"
            >
              Утас
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6">
        <section className="relative overflow-hidden rounded-[32px] bg-[#0a0d12] shadow-[0_30px_80px_rgba(10,13,18,0.18)]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1800&q=80')",
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,10,13,0.9),rgba(8,10,13,0.3),rgba(8,10,13,0.7))]" />

          <div className="relative grid gap-8 px-6 py-8 md:grid-cols-[1.2fr_0.8fr] md:px-10 md:py-12">
            <div className="flex flex-col justify-center">
              <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-white/80 uppercase backdrop-blur-sm">
                Том төслүүдэд итгэмжлэгдсэн
              </div>

              <h1 className="max-w-xl text-4xl font-black leading-[0.95] tracking-[-0.06em] text-white md:text-6xl">
                Ажлын талбарын хүн бүхэнд зориулсан техникүүд
              </h1>

              <p className="mt-5 max-w-lg text-base text-slate-200 md:text-lg">
                Ухах, өндөрт ажиллах, бетон, цахилгаан тоног төхөөрөмжийн түрээс. Шуурхай хүргэлт, тодорхой үнэ, мэргэжлийн дэмжлэг.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  className="rounded-full bg-[#f5b91d] px-5 py-3 text-sm font-bold text-[#0c1117] transition hover:brightness-105"
                  type="button"
                >
                  Тоног захиалах
                </button>
                <button
                  className="rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  type="button"
                >
                  Захиалга харах
                </button>
              </div>
            </div>

            <div className="flex items-end justify-center md:justify-end">
              <div className="w-full max-w-md rounded-[24px] border border-white/10 bg-[#111923]/75 p-5 text-white backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Энэ долоо хоногт бэлэн</p>
                    <p className="mt-2 text-3xl font-black tracking-[-0.06em]">132</p>
                  </div>
                  <div className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-300">
                    Илгээхэд бэлэн
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {stats.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                      <span className="text-sm text-slate-200">{item.label}</span>
                      <span className="text-lg font-bold text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {categories.map((item) => (
            <div key={item.name} className="rounded-[22px] border border-[#dfe3db] bg-white p-4 shadow-[0_12px_28px_rgba(21,30,35,0.04)]">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{item.name}</p>
              <p className="mt-3 text-3xl font-black tracking-[-0.06em] text-[#101820]">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] border border-[#dfe3db] bg-white p-5 shadow-[0_12px_28px_rgba(21,30,35,0.04)]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Онцлох парк</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.06em] text-[#101820]">Түгээмэл түрээс</h2>
              </div>
              <button className="rounded-full bg-[#0a0d12] px-3 py-2 text-xs font-semibold text-white" type="button">
                Бүгдийг харах
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {fleet.map((item) => (
                <article key={item.title} className="overflow-hidden rounded-[22px] border border-[#e6e8e2] bg-[#f6f7f1]">
                  <img
                    className="h-40 w-full object-cover object-center"
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                  />
                  <div className="p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="rounded-full bg-[#e8f2ff] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#214c80]">
                        {item.badge}
                      </span>
                      <span className="text-sm font-bold text-[#101820]">{item.price}</span>
                    </div>
                    <h3 className="text-lg font-black tracking-[-0.04em] text-[#101820]">{item.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{item.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] bg-[#111923] p-6 text-white shadow-[0_20px_50px_rgba(17,25,35,0.2)]">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Шуурхай машин хэрэгтэй юу?</p>
            <h3 className="mt-3 text-3xl font-black tracking-[-0.06em] text-white">3 алхмаар түрээсийн дэмжлэг аваарай.</h3>
            <div className="mt-6 space-y-4">
              {[
                ["01", "Ажил, байршлаа бидэнд хэлнэ үү"],
                ["02", "Зөв тоног төхөөрөмжийг сонгоно"],
                ["03", "Бид талбайд хүргэж, дэмжлэг үзүүлнэ"],
              ].map(([step, text]) => (
                <div key={step} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5b91d] text-sm font-black text-[#101820]">
                    {step}
                  </span>
                  <p className="flex items-center text-sm text-slate-100">{text}</p>
                </div>
              ))}
            </div>
            <button className="mt-6 w-full rounded-full bg-[#f5b91d] px-4 py-3 text-sm font-bold text-[#101820]" type="button">
              Үнийн санал авах
            </button>
          </div>
        </section>

        <section className="mt-12 rounded-[32px] bg-[#0a0d12] p-6 text-white shadow-[0_18px_40px_rgba(10,13,18,0.15)] md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Яагаад бид</p>
              <h3 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Тайлбарлагдсан, найдвартай ажлын талбайн шийдэл.</h3>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200">
              <span className="inline-block h-2 w-2 rounded-full bg-[#8ec5ff]" />
              Бүх нутагт бэлэн
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Өдөр тутмын хүргэлт", "Төлөвлөгөө өөрчлөгдсөн ч хурдан тоног төхөөрөмжийг шилжүүлнэ."],
              ["Засвар үйлчилгээ багтсан", "Бүх нэгжийг шалгаж, засварлаж, ажилд бэлэн болгосон."],
              ["Тохируулсан нөхцөл", "Өдөр, долоо хоног, урт хугацааны түрээсийн тодорхой үнийн санал."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300">{title}</p>
                <p className="mt-3 text-base text-slate-100">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
