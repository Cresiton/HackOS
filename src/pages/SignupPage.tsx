import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, Github, Linkedin, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", valid: password.length >= 8 },
    { label: "Uppercase", valid: /[A-Z]/.test(password) },
    { label: "Lowercase", valid: /[a-z]/.test(password) },
    { label: "Number", valid: /\d/.test(password) },
  ];

  return (
    <div className="mt-2 space-y-1.5">
      <div className="grid grid-cols-4 gap-1">
        {checks.map((check, i) => (
          <div
            key={i}
            className="h-1 rounded-full transition-all"
            style={{
              background: check.valid ? "#22C55E" : "rgba(255,255,255,0.1)",
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-1 text-[11px]">
            <CheckCircle
              size={10}
              style={{ color: check.valid ? "#22C55E" : "rgba(255,255,255,0.2)" }}
            />
            <span style={{ color: check.valid ? "#22C55E" : "rgba(255,255,255,0.3)" }}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const isValid =
    name && email && password.length >= 8 &&
    /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) &&
    password === confirm && agreed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    try {
      await signup(name, email, password);
      toast.success("Welcome to HackOS! Let's build your profile 🚀");
      navigate("/profile-setup");
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-8"
      style={{
        background: "#06070B",
        backgroundImage: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(124,92,255,0.08) 0%, transparent 60%)",
      }}
    >
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
              style={{ background: "linear-gradient(135deg, #7C5CFF, #4F7CFF)" }}
            >
              H
            </div>
            <span className="text-white font-700 text-xl">HackOS</span>
          </Link>
          <h1 className="text-white font-700 text-2xl">Create your account</h1>
          <p className="text-white/40 text-sm mt-1">Join 12,000+ builders worldwide</p>
        </div>

        <div
          className="p-8 rounded-[28px]"
          style={{
            background: "#131826",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          }}
        >
          {/* Social Auth */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button className="hack-btn-secondary justify-center py-3 gap-2">
              <Github size={16} />
              GitHub
            </button>
            <button className="hack-btn-secondary justify-center py-3 gap-2">
              <Linkedin size={16} />
              LinkedIn
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-white/25 text-xs">or with email</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/60 text-sm font-500 mb-2">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Singh"
                className="hack-input"
                required
              />
            </div>

            <div>
              <label className="block text-white/60 text-sm font-500 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="hack-input"
                required
              />
            </div>

            <div>
              <label className="block text-white/60 text-sm font-500 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="hack-input pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password && <PasswordStrength password={password} />}
            </div>

            <div>
              <label className="block text-white/60 text-sm font-500 mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm your password"
                className="hack-input"
                style={{
                  borderColor: confirm && password !== confirm ? "rgba(239,68,68,0.5)" : undefined,
                }}
                required
              />
              {confirm && password !== confirm && (
                <p className="text-hack-red text-xs mt-1">Passwords don&apos;t match</p>
              )}
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 accent-hack-primary"
              />
              <span className="text-white/40 text-sm">
                I agree to HackOS{" "}
                <span className="text-hack-primary">Terms of Service</span> and{" "}
                <span className="text-hack-primary">Privacy Policy</span>
              </span>
            </label>

            <button
              type="submit"
              disabled={!isValid || loading}
              className="hack-btn-primary w-full justify-center py-3 text-base"
              style={{ opacity: !isValid || loading ? 0.5 : 1 }}
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Creating account...</>
              ) : (
                <><span>Create Account</span><ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="text-center text-white/40 text-sm mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-hack-primary hover:text-hack-primary-hover font-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
