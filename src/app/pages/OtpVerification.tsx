import { useState, useRef, useEffect, FormEvent } from "react";
import { useLocation, useNavigate, Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../config/api";
import logo from "../../assets/logo.png";
import { ShieldCheck, ArrowLeft, RefreshCw, Smartphone } from "lucide-react";

export function OtpVerification() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);
  const [timer, setTimer] = useState(60);
  
  const { setUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Obtener email desde el estado de la navegación
  const email = location.state?.email;

  useEffect(() => {
    if (!email) {
      navigate("/");
    }
  }, [email, navigate]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Mover al siguiente input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      setError("Ingresa el código completo de 6 dígitos");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const data = await apiRequest<{ accessToken: string; deviceId: string }>("/auth/verify-email-code", {
        method: "POST",
        body: JSON.stringify({
          email,
          code,
          rememberDevice,
        }),
      });

      if (data.accessToken) {
        localStorage.setItem("agro-token", data.accessToken);
        
        // Guardar el identificador del dispositivo si se solicitó recordar
        if (data.deviceId) {
          localStorage.setItem("agro-device-id", data.deviceId);
        }
        
        // Obtener datos del usuario tras verificación exitosa
        const backendUser = await apiRequest<any>("/auth/me", {
          headers: { Authorization: `Bearer ${data.accessToken}` }
        });
        
        const mappedUser = {
          id: backendUser.id.toString(),
          name: backendUser.fullName,
          email: backendUser.email,
          role: backendUser.role,
          roleId: backendUser.roleId,
          phone: backendUser.phone,
          dui: backendUser.dui,
          branch: 'Todas'
        };
        
        setUser(mappedUser);
        localStorage.setItem("agro-user", JSON.stringify(mappedUser));
        navigate("/home");
      }
    } catch (err: any) {
      setError(err.message || "Código inválido o expirado");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (timer > 0) return;
    try {
      await apiRequest("/auth/resend-email-code", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setTimer(60);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      setError("");
    } catch (err: any) {
      setError("No se pudo reenviar el código");
    }
  };

  if (!email) return null;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <div
        className="w-full max-w-md p-8 rounded-2xl border shadow-lg"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
          boxShadow: "0 20px 50px var(--shadow)",
        }}
      >
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="Logo" className="w-48 h-auto mb-6" />
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)" }}
          >
            <ShieldCheck size={32} style={{ color: "var(--accent)" }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-main)" }}>
            Verificación de Seguridad
          </h1>
          <p className="text-center mt-2 text-sm px-4" style={{ color: "var(--text-sec)" }}>
            Hemos enviado un código de 6 dígitos a su correo electrónico: <br />
            <strong style={{ color: "var(--text-main)" }}>{email}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div
              className="p-3 rounded-lg text-sm text-center"
              style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}
            >
              {error}
            </div>
          )}

          <div className="flex justify-between gap-2">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                value={digit}
                maxLength={1}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-12 h-14 text-center text-xl font-bold rounded-xl border focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: "var(--bg)",
                  borderColor: "var(--border)",
                  color: "var(--text-main)",
                  outlineColor: "var(--accent)",
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}>
            <input
              type="checkbox"
              id="remember"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              className="w-5 h-5 accent-emerald-500 cursor-pointer"
            />
            <label htmlFor="remember" className="text-sm cursor-pointer select-none" style={{ color: "var(--text-sec)" }}>
              <div className="flex items-center gap-1.5 font-medium" style={{ color: "var(--text-main)" }}>
                <Smartphone size={14} />
                Recordar este dispositivo
              </div>
              Confiar en este equipo por 30 días
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold transition-all"
            style={{
              backgroundColor: "var(--accent)",
              color: "#ffffff",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Verificando..." : "Confirmar Código"}
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-4">
          <button
            onClick={handleResendCode}
            disabled={timer > 0}
            className="text-sm flex items-center gap-2 hover:opacity-80 transition-opacity"
            style={{ color: timer > 0 ? "var(--text-sec)" : "var(--accent)" }}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            {timer > 0 ? `Reenviar código en ${timer}s` : "Reenviar código"}
          </button>

          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-medium hover:underline"
            style={{ color: "var(--text-sec)" }}
          >
            <ArrowLeft size={16} />
            Volver al Inicio de Sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
