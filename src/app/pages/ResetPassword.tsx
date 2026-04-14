import { useState, FormEvent } from "react";
import logo from "../../assets/logo.png";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "../config/api";

export function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Token de recuperación no válido o ausente.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    
    try {
      await apiRequest("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword: password }),
      });
      setSubmitted(true);
      
      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "No se pudo restablecer la contraseña. El link puede haber expirado.");
    } finally {
      setLoading(false);
    }
  };

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
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-0">
            <img src={logo} alt="Logo" className="w-56 h-auto mx-auto" />
          </div>

          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-main)" }}
          >
            Nueva Contraseña
          </h1>

          <p style={{ color: "var(--text-sec)" }} className="mt-2 text-center text-sm">
            Establece una nueva contraseña segura para tu cuenta.
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                className="flex items-center gap-2 p-3 rounded-lg text-sm"
                style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}
              >
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {/* New Password Input */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-main)" }}
              >
                Nueva Contraseña
              </label>
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-lg border relative"
                style={{
                  backgroundColor: "var(--bg)",
                  borderColor: "var(--border)",
                }}
              >
                <Lock size={20} style={{ color: "var(--text-sec)" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="flex-1 bg-transparent outline-none"
                  style={{ color: "var(--text-main)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 hover:opacity-70 transition-opacity"
                  style={{ color: "var(--text-sec)" }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-main)" }}
              >
                Confirmar Contraseña
              </label>
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-lg border"
                style={{
                  backgroundColor: "var(--bg)",
                  borderColor: "var(--border)",
                }}
              >
                <Lock size={20} style={{ color: "var(--text-sec)" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="flex-1 bg-transparent outline-none"
                  style={{ color: "var(--text-main)" }}
                />
              </div>
            </div>

            {/* Submit Button */}
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
              {loading ? "Actualizando..." : "Actualizar Contraseña"}
            </button>
          </form>
        ) : (
          <div className="text-center py-4">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <CheckCircle size={32} />
              </div>
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-main)" }}>
              ¡Éxito!
            </h2>
            <p style={{ color: "var(--text-sec)" }} className="mb-4">
              Tu contraseña ha sido actualizada correctamente.
            </p>
            <p className="text-sm" style={{ color: "var(--text-sec)" }}>
              Serás redirigido al inicio de sesión en unos segundos...
            </p>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            to="/"
            className="text-sm font-medium hover:underline transition-all"
            style={{ color: "var(--text-sec)" }}
          >
            Volver al Inicio de Sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
