import { useState, FormEvent } from "react";
import logo from "../../assets/logo.png";

import { useNavigate, Link } from "react-router";
import { useAuth, Branch } from "../context/AuthContext";
import { Mail, Lock, AlertCircle, MapPin, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"login" | "select-branch">("login");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [userId, setUserId] = useState<number | null>(null);

  const { login, selectBranch } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log('Iniciando login para:', email);
      const response = await login(email, password);
      console.log('Respuesta de login:', response);

      if (response.requireBranchSelection) {
        console.log('Requiere selección de sucursal. Sucursales:', response.branches);
        setBranches(response.branches || []);
        setUserId(response.user?.id || null);
        setStep("select-branch");
      } else if (response.accessToken) {
        console.log('Login exitoso (sucursal única)');
        navigate("/home");
      }
    } catch (err: any) {
      console.error('Error en handleSubmit:', err);
      setError(err.message || "Credenciales incorrectas. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBranch = async (branchId: number) => {
    if (!userId) return;
    setError("");
    setLoading(true);

    try {
      const response = await selectBranch(userId, branchId);
      if (response.accessToken) {
        navigate("/home");
      }
    } catch (err: any) {
      setError(err.message || "Error al seleccionar sucursal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 transition-colors duration-300"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <div
        className="w-full max-w-md p-8 rounded-2xl border shadow-lg transition-all duration-300"
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
            Agroferr D'Campo
          </h1>

          <p style={{ color: "var(--text-sec)" }} className="mt-2 text-center">
            {step === "login" 
              ? "Sistema de Gestión Multi-Sucursal" 
              : "Selecciona una sucursal para continuar"}
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="size-5" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === "login" ? (
          /* Login Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <div className="relative">
                <Mail 
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-5" 
                  style={{ color: "var(--text-sec)" }} 
                />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock 
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-5" 
                  style={{ color: "var(--text-sec)" }} 
                />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Button
                type="submit"
                disabled={loading}
                variant="premium"
                className="w-full"
              >
                {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>

              <div className="text-center">
                <Link
                  to="/forgot-password"
                  className="text-sm hover:underline transition-all font-medium"
                  style={{ color: "var(--primary)" }}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>
          </form>
        ) : (
          /* Branch Selection */
          <div className="space-y-4">
            <div className="grid gap-3">
              {branches && branches.length > 0 ? (
                branches.map((branch) => (
                  <Button
                    key={branch.id}
                    onClick={() => handleSelectBranch(branch.id)}
                    disabled={loading}
                    variant="outline"
                    className="flex h-auto w-full items-center justify-start p-4 rounded-2xl border-2 border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all group text-left shadow-sm"
                  >
                    <div className="flex items-center gap-4 w-full">
                      <div className="p-3 rounded-xl bg-[var(--bg)] text-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-white transition-all shadow-sm">
                        <MapPin size={22} />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-lg leading-none mb-1 text-[var(--text-main)]">
                          {branch.name}
                        </div>
                        <div className="text-xs uppercase tracking-widest font-bold text-[var(--text-sec)]">
                          ROL: {branch.role}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))
              ) : (
                <div className="text-center py-8" style={{ color: "var(--text-sec)" }}>
                  <AlertCircle size={40} className="mx-auto mb-2 opacity-50" />
                  <p>No se encontraron sucursales asignadas.</p>
                </div>
              )}
            </div>

            <Button
              onClick={() => setStep("login")}
              disabled={loading}
              variant="ghost"
              className="w-full flex items-center justify-center gap-2 text-[var(--text-sec)]"
            >
              <ArrowLeft size={16} />
              Volver al login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

