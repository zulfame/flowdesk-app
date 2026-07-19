import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Waves, Loader2, CheckSquare, Video, CalendarDays } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password);
      toast.success("Selamat datang di FlowDesk");
      navigate("/");
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -top-16 -left-16 h-72 w-72 rounded-full bg-white/5 blur-2xl" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="h-11 w-11 rounded-2xl bg-white/15 flex items-center justify-center">
            <Waves className="h-6 w-6" />
          </div>
          <span className="font-heading font-extrabold text-2xl tracking-tight">FlowDesk</span>
        </div>
        <div className="relative z-10 space-y-6 max-w-md">
          <h1 className="font-heading text-4xl font-extrabold leading-tight">Kelola pekerjaan harian dengan tenang.</h1>
          <p className="text-primary-foreground/80 text-lg">Sederhana untuk digunakan, kuat di balik layar. Pahami dalam lima menit.</p>
          <div className="space-y-3 pt-4">
            {[{ i: CheckSquare, t: "Tugas dengan progres otomatis" }, { i: Video, t: "Rapat sebagai buku catatan digital" }, { i: CalendarDays, t: "Kalender terpadu untuk semua" }].map((f, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center"><f.i className="h-5 w-5" /></div>
                <span className="font-medium">{f.t}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-primary-foreground/60 text-sm">© 2026 FlowDesk · Work Management System</p>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center"><Waves className="h-5 w-5 text-primary-foreground" /></div>
            <span className="font-heading font-extrabold text-xl">FlowDesk</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-1">{mode === "login" ? "Masuk ke akun" : "Buat akun baru"}</h2>
          <p className="text-muted-foreground text-sm mb-8">{mode === "login" ? "Masukkan kredensial Anda untuk melanjutkan." : "Daftar untuk mulai mengelola pekerjaan."}</p>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nama Anda" className="h-11 rounded-xl" data-testid="input-name" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="anda@perusahaan.com" className="h-11 rounded-xl" data-testid="input-email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Kata Sandi</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="h-11 rounded-xl" data-testid="input-password" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl font-semibold" data-testid="btn-submit-auth">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === "login" ? "Masuk" : "Daftar"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground mt-6 text-center">
            {mode === "login" ? "Belum punya akun? " : "Sudah punya akun? "}
            <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="text-primary font-semibold hover:underline" data-testid="btn-toggle-mode">
              {mode === "login" ? "Daftar sekarang" : "Masuk di sini"}
            </button>
          </p>

          {mode === "login" && (
            <div className="mt-6 p-3 rounded-xl bg-secondary/60 text-xs text-muted-foreground text-center">
              Demo admin: <span className="font-mono font-semibold">admin@flowdesk.com</span> / <span className="font-mono font-semibold">admin123</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
