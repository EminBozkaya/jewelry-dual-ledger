import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const loginSchema = z.object({
  username: z.string().min(1, "Kullanıcı adı gereklidir"),
  password: z.string().min(1, "Şifre gereklidir"),
});

type LoginForm = z.infer<typeof loginSchema>;

/* ── Animated gold particles on canvas ── */
function GoldParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const dpr = window.devicePixelRatio || 1;

    function resize() {
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
      canvas!.style.width = window.innerWidth + "px";
      canvas!.style.height = window.innerHeight + "px";
      ctx!.scale(dpr, dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    interface Particle {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      fadeDir: number;
      hue: number;
    }

    const particles: Particle[] = [];
    const count = 60;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 2.5 + 0.5,
        speedY: -(Math.random() * 0.3 + 0.1),
        speedX: (Math.random() - 0.5) * 0.2,
        opacity: Math.random() * 0.5 + 0.1,
        fadeDir: Math.random() > 0.5 ? 1 : -1,
        hue: Math.random() * 20 + 35,
      });
    }

    function draw() {
      ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of particles) {
        p.y += p.speedY;
        p.x += p.speedX;
        p.opacity += p.fadeDir * 0.003;
        if (p.opacity >= 0.7) p.fadeDir = -1;
        if (p.opacity <= 0.05) p.fadeDir = 1;

        if (p.y < -10) {
          p.y = window.innerHeight + 10;
          p.x = Math.random() * window.innerWidth;
        }

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(${p.hue}, 80%, 55%, ${p.opacity})`;
        ctx!.fill();

        // glow
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(${p.hue}, 80%, 55%, ${p.opacity * 0.15})`;
        ctx!.fill();
      }
      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}

/* ── Animated Kuyumcu diamond logo ── */
function DiamondLogo() {
  return (
    <div className="login-logo-wrap">
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Diamond shape */}
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5d16e" />
            <stop offset="50%" stopColor="#d4a437" />
            <stop offset="100%" stopColor="#b8860b" />
          </linearGradient>
          <linearGradient id="goldShine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="40%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="60%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        {/* Top facet */}
        <polygon points="28,4 8,20 28,16 48,20" fill="url(#goldGrad)" opacity="0.9"/>
        {/* Left facet */}
        <polygon points="8,20 28,52 28,16" fill="#c9982a" opacity="0.8"/>
        {/* Right facet */}
        <polygon points="48,20 28,52 28,16" fill="#e8b84a" opacity="0.95"/>
        {/* Shine overlay */}
        <polygon points="28,4 8,20 28,52 48,20" fill="url(#goldShine)" opacity="0.4"/>
      </svg>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      await login(data);
      navigate("/");
    } catch {
      setError("Kullanıcı adı veya şifre hatalı.");
    }
  };

  return (
    <>
      {/* Scoped styles — completely isolated from the rest of the app */}
      <style>{`
        /* ── Login Page Scoped Styles ───────────────────────── */
        .login-fullscreen {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          min-height: 100dvh;
          padding: 1rem;
          background: #0a0a0f;
          overflow: hidden;
          font-family: 'Geist Variable', 'Inter', system-ui, -apple-system, sans-serif;
        }

        /* Radial gradients for depth */
        .login-bg-layer {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .login-bg-layer::before {
          content: '';
          position: absolute;
          top: -30%;
          left: -20%;
          width: 70%;
          height: 70%;
          background: radial-gradient(ellipse, rgba(184, 134, 11, 0.08) 0%, transparent 70%);
        }
        .login-bg-layer::after {
          content: '';
          position: absolute;
          bottom: -20%;
          right: -15%;
          width: 60%;
          height: 60%;
          background: radial-gradient(ellipse, rgba(212, 164, 55, 0.06) 0%, transparent 70%);
        }

        /* Grid lines — subtle like a trading terminal */
        .login-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(212, 164, 55, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(212, 164, 55, 0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%);
          -webkit-mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%);
        }

        /* Card */
        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          border-radius: 20px;
          padding: 3rem 2.5rem 2.5rem;
          opacity: 0;
          transform: translateY(24px) scale(0.97);
          animation: loginCardIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          overflow: hidden;
          box-shadow:
            0 25px 60px rgba(0, 0, 0, 0.6),
            0 0 120px rgba(184, 134, 11, 0.08);
        }
        .login-card.mounted {
          animation-play-state: running;
        }

        @keyframes loginCardIn {
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Inner background masking the spinning light to create a 1px border */
        .login-card::before {
          content: '';
          position: absolute;
          inset: 1px;
          border-radius: 19px;
          background: rgba(18, 18, 26, 0.85);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          z-index: -1;
        }
        
        /* The spinning border light */
        .login-card::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 200%;
          height: 200%;
          background: conic-gradient(
            from 180deg at 50% 50%,
            rgba(212, 164, 55, 0.15) 0deg,
            rgba(212, 164, 55, 0.15) 280deg,
            rgba(212, 164, 55, 0.5) 340deg,
            #f5d16e 360deg
          );
          transform: translate(-50%, -50%);
          animation: borderLightSpin 10s linear infinite;
          z-index: -2;
        }

        @keyframes borderLightSpin {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }

        /* Logo */
        .login-logo-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(212, 164, 55, 0.12), transparent 70%);
          animation: logoPulse 3s ease-in-out infinite;
        }
        @keyframes logoPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(212, 164, 55, 0.1); }
          50% { box-shadow: 0 0 40px rgba(212, 164, 55, 0.2); }
        }

        /* Heading */
        .login-heading {
          text-align: center;
          margin-bottom: 0.25rem;
          font-size: 1.75rem;
          font-weight: 700;
          letter-spacing: -0.5px;
          background: linear-gradient(135deg, #f5d16e 0%, #d4a437 50%, #b8860b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .login-subtitle {
          text-align: center;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.4);
          margin-bottom: 2rem;
          font-weight: 400;
          letter-spacing: 0.2px;
        }

        /* Error toast */
        .login-error {
          background: rgba(220, 38, 38, 0.12);
          border: 1px solid rgba(220, 38, 38, 0.25);
          border-radius: 10px;
          padding: 0.75rem 1rem;
          margin-bottom: 1.25rem;
          color: #f87171;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .login-error::before {
          content: '⚠';
          font-size: 1rem;
        }

        /* Field groups */
        .login-field {
          margin-bottom: 1.25rem;
        }
        .login-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 1.2px;
        }
        .login-input-wrap {
          position: relative;
        }
        .login-input {
          width: 100%;
          height: 50px;
          padding: 0 1rem;
          font-size: 0.95rem;
          font-family: inherit;
          color: #f0f0f0;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          outline: none;
          transition: all 0.25s ease;
          box-sizing: border-box;
        }
        .login-input::placeholder {
          color: rgba(255, 255, 255, 0.2);
        }
        .login-input:focus {
          border-color: rgba(212, 164, 55, 0.5);
          background: rgba(255, 255, 255, 0.06);
          box-shadow: 0 0 0 3px rgba(212, 164, 55, 0.08), 0 0 20px rgba(212, 164, 55, 0.06);
        }
        .login-input.has-error {
          border-color: rgba(220, 38, 38, 0.5);
        }
        .login-input-wrap .pwd-toggle {
          position: absolute;
          right: 4px;
          top: 50%;
          transform: translateY(-50%);
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          color: rgba(255, 255, 255, 0.3);
          transition: all 0.2s ease;
          min-height: unset;
          min-width: unset;
        }
        .login-input-wrap .pwd-toggle:hover {
          color: rgba(212, 164, 55, 0.8);
          background: rgba(212, 164, 55, 0.08);
        }

        .login-field-error {
          font-size: 0.78rem;
          color: #f87171;
          margin-top: 0.35rem;
          padding-left: 0.25rem;
        }

        /* Submit button */
        .login-submit {
          width: 100%;
          height: 52px;
          margin-top: 0.75rem;
          font-family: inherit;
          font-size: 1rem;
          font-weight: 600;
          letter-spacing: 0.5px;
          color: #0a0a0f;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #f5d16e, #d4a437, #b8860b);
          background-size: 200% 200%;
          animation: shimmer 3s ease-in-out infinite;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(184, 134, 11, 0.25);
        }
        .login-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 30px rgba(184, 134, 11, 0.35);
        }
        .login-submit:active:not(:disabled) {
          transform: translateY(0);
        }
        .login-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        @keyframes shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        /* Loading spinner */
        .login-spinner {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 2px solid rgba(10, 10, 15, 0.2);
          border-top-color: #0a0a0f;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Footer text */
        .login-footer {
          text-align: center;
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.2);
          font-size: 0.75rem;
          letter-spacing: 0.5px;
        }
        .login-footer span {
          color: rgba(212, 164, 55, 0.5);
        }

        /* Responsive */
        @media (max-width: 480px) {
          .login-card {
            padding: 2rem 1.5rem 1.75rem;
            border-radius: 16px;
          }
          .login-heading {
            font-size: 1.5rem;
          }
          .login-logo-wrap {
            width: 64px;
            height: 64px;
          }
          .login-logo-wrap svg {
            width: 44px;
            height: 44px;
          }
        }
      `}</style>

      <div className="login-fullscreen">
        <div className="login-bg-layer" />
        <div className="login-grid" />
        <GoldParticles />

        <div className={`login-card ${mounted ? "mounted" : ""}`}>
          <DiamondLogo />

          <h1 className="login-heading">Cari Özel</h1>
          <p className="login-subtitle">Hesabınıza giriş yapın</p>

          <form onSubmit={handleSubmit(onSubmit)}>
            {error && <div className="login-error">{error}</div>}

            <div className="login-field">
              <label htmlFor="login-username" className="login-label">
                Kullanıcı Adı
              </label>
              <div className="login-input-wrap">
                <input
                  id="login-username"
                  className={`login-input ${errors.username ? "has-error" : ""}`}
                  {...register("username")}
                  placeholder="kullanıcı adınızı girin"
                  autoComplete="username"
                  autoFocus
                />
              </div>
              {errors.username && (
                <p className="login-field-error">{errors.username.message}</p>
              )}
            </div>

            <div className="login-field">
              <label htmlFor="login-password" className="login-label">
                Şifre
              </label>
              <div className="login-input-wrap">
                <input
                  id="login-password"
                  className={`login-input ${errors.password ? "has-error" : ""}`}
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ paddingRight: "3.2rem" }}
                />
                <button
                  type="button"
                  className="pwd-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="login-field-error">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              className="login-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="login-spinner" />
                  Giriş yapılıyor…
                </>
              ) : (
                "Giriş Yap"
              )}
            </button>
          </form>

          <div className="login-footer">
            Güvenli bağlantı <span>•</span> Şifreli iletişim
          </div>
        </div>
      </div>
    </>
  );
}
