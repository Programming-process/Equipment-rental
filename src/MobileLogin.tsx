import { useState, type FormEvent } from "react";
import { api, type Session, type User } from "./lib/api";

const assetPathPrefix = "/assets";
const imgScanLine = `${assetPathPrefix}/cc583.svg`;
const imgDot = `${assetPathPrefix}/mobile-510a9.svg`;
const imgEyeOff = `${assetPathPrefix}/bd00d.svg`;
const imgArrowRight = `${assetPathPrefix}/18191.svg`;
const imgShieldCheck = `${assetPathPrefix}/afd3d.svg`;

export default function MobileLogin({
  onLogin,
}: {
  onLogin?: (result: { message: string; user: User; session: Session }) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (mode === "register" && password !== confirmPassword) {
      setError("Нууц үгүүд таарахгүй байна.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result =
        mode === "register"
          ? await api.register({ email, name, company, password })
          : await api.login({ email, password });
      onLogin?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Хүсэлт амжилтгүй боллоо.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      className="flex min-h-dvh w-full flex-col bg-[#eef2f4]"
      data-name="Нэвтрэх дэлгэц"
      data-node-id="5:17896"
    >
      <section
        className="flex min-h-[250px] w-full shrink-0 flex-col items-start justify-end overflow-hidden bg-[#101c25] px-[24px] pb-[24px]"
        data-name="Hero"
        data-node-id="5:17897"
      >
        <div
          className="flex w-full shrink-0 flex-col items-start gap-[14px] overflow-hidden"
          data-name="Brand"
          data-node-id="5:17904"
        >
          <div
            className="flex size-[48px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[#1677a8]"
            data-name="Brand mark"
            data-node-id="5:17905"
          >
            <img alt="" className="size-[25px]" src={imgScanLine} />
          </div>
          <p className="font-['Inter:Bold'] text-[12px] font-bold whitespace-nowrap text-[#e2f1f7]">
            ТҮРЭЭС OPS · MOBILE
          </p>
          <h1 className="w-full font-['Inter:Bold'] text-[29px] leading-[1.12] font-bold text-white">
            Талбай дээрх түрээсийг нэг дор удирд
          </h1>
          <div className="flex shrink-0 items-center gap-[7px] overflow-hidden">
            <div className="flex shrink-0 items-center gap-[5px] overflow-hidden rounded-full bg-[#e3f3ec] px-[8px] py-[5px]">
              <img alt="" className="size-[6px]" src={imgDot} />
              <span className="font-['Inter:Bold'] text-[10px] font-bold whitespace-nowrap text-[#238a62]">
                MQTT ONLINE
              </span>
            </div>
            <span className="font-['Inter:Regular'] text-[10px] whitespace-nowrap text-[#91a0aa]">
              Синк: 8 сек өмнө
            </span>
          </div>
        </div>
      </section>

      <form
        className="flex w-full flex-1 flex-col items-start gap-[14px] bg-white p-[20px]"
        onSubmit={handleSubmit}
      >
        <h2 className="w-full font-['Inter:Bold'] text-[20px] font-bold text-[#14212a]">
          {mode === "login" ? "Нэвтрэх" : "Шинэ хэрэглэгч бүртгүүлэх"}
        </h2>
        <p className="w-full font-['Inter:Regular'] text-[12px] leading-[1.45] text-[#667784]">
          {mode === "login"
            ? "Бүртгэлтэй имэйл болон нууц үгээ оруулна уу."
            : "Түрээслэгчийн бүртгэл үүсгэнэ. Админы эрхийг бүртгэлээр сонгох боломжгүй."}
        </p>

        {mode === "register" && (
          <>
            <label className="flex w-full flex-col gap-[6px]">
              <span className="font-['Inter:Bold'] text-[11px] font-bold text-[#667784]">
                ОВОГ, НЭР
              </span>
              <input
                autoComplete="name"
                className="h-[48px] w-full rounded-[6px] border border-[#d6dfe4] px-[13px] text-[13px] outline-none focus:border-[#1677a8]"
                maxLength={100}
                minLength={2}
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </label>
            <label className="flex w-full flex-col gap-[6px]">
              <span className="font-['Inter:Bold'] text-[11px] font-bold text-[#667784]">
                БАЙГУУЛЛАГА
              </span>
              <input
                autoComplete="organization"
                className="h-[48px] w-full rounded-[6px] border border-[#d6dfe4] px-[13px] text-[13px] outline-none focus:border-[#1677a8]"
                maxLength={150}
                minLength={2}
                onChange={(event) => setCompany(event.target.value)}
                required
                value={company}
              />
            </label>
          </>
        )}

        <label className="flex w-full flex-col gap-[6px]">
          <span className="font-['Inter:Bold'] text-[11px] font-bold text-[#667784]">
            ИМЭЙЛ
          </span>
          <input
            autoComplete="email"
            className="h-[48px] w-full rounded-[6px] border border-[#d6dfe4] px-[13px] text-[13px] outline-none focus:border-[#1677a8]"
            maxLength={254}
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>

        <label className="flex w-full flex-col gap-[6px]">
          <span className="font-['Inter:Bold'] text-[11px] font-bold text-[#667784]">
            НУУЦ ҮГ
          </span>
          <span className="flex h-[48px] w-full items-center justify-between rounded-[6px] border border-[#d6dfe4] px-[13px] focus-within:border-[#1677a8]">
            <input
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[#14212a] outline-none"
              maxLength={128}
              minLength={12}
              onChange={(event) => setPassword(event.target.value)}
              required
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <button
              aria-label={showPassword ? "Нууц үг нуух" : "Нууц үг харуулах"}
              className="flex size-[32px] shrink-0 items-center justify-end"
              onClick={() => setShowPassword((visible) => !visible)}
              type="button"
            >
              <img alt="" className="size-[18px]" src={imgEyeOff} />
            </button>
          </span>
          {mode === "register" && (
            <span className="text-[10px] text-[#74838d]">
              12-оос доошгүй тэмдэгт
            </span>
          )}
        </label>

        {mode === "register" && (
          <label className="flex w-full flex-col gap-[6px]">
            <span className="font-['Inter:Bold'] text-[11px] font-bold text-[#667784]">
              НУУЦ ҮГ ДАХИН ОРУУЛАХ
            </span>
            <input
              autoComplete="new-password"
              className="h-[48px] w-full rounded-[6px] border border-[#d6dfe4] px-[13px] text-[13px] outline-none focus:border-[#1677a8]"
              maxLength={128}
              minLength={12}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
            />
          </label>
        )}

        {error && (
          <p className="w-full rounded-[8px] bg-[#fff1f0] px-[10px] py-[8px] font-['Inter:Regular'] text-[10px] text-[#cc524c]">
            {error}
          </p>
        )}

        <button
          className="flex h-[52px] w-full shrink-0 items-center justify-center gap-[8px] overflow-hidden rounded-[10px] border border-[#1677a8] bg-[#1677a8] px-[16px] transition-colors hover:bg-[#12658f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1677a8] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          <img alt="" className="size-[20px]" src={imgArrowRight} />
          <span className="font-['Inter:Bold'] text-[14px] font-bold whitespace-nowrap text-white">
            {isSubmitting
              ? "Хүлээнэ үү..."
              : mode === "login"
                ? "Нэвтрэх"
                : "Бүртгэл үүсгэх"}
          </span>
        </button>

        <button
          className="w-full py-1 text-[12px] font-semibold text-[#1677a8]"
          onClick={() => {
            setMode((current) =>
              current === "login" ? "register" : "login",
            );
            setError("");
          }}
          type="button"
        >
          {mode === "login"
            ? "Шинэ хэрэглэгч үү? Бүртгүүлэх"
            : "Бүртгэлтэй юу? Нэвтрэх"}
        </button>

        <div className="flex w-full items-center justify-center gap-[7px]">
          <img alt="" className="size-[15px]" src={imgShieldCheck} />
          <p className="font-['Inter:Regular'] text-[10px] whitespace-nowrap text-[#667784]">
            Байгууллагын төхөөрөмж · Нууцлал хамгаалагдсан
          </p>
        </div>
      </form>
    </main>
  );
}
