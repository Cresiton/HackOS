import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, Github, Linkedin, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back to HackOS! 🚀");
      navigate("/dashboard");
    } catch (err) {
      toast.error("Invalid credentials. Try any email/password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: "#06070B",
        backgroundImage: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(124,92,255,0.08) 0%, transparent 60%)",
      }}
    >
      <div className="w-full max-w-md px-6">
        {/* Logo */}
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
          <h1 className="text-white font-700 text-2xl">Welcome back</h1>
          <p className="text-white/40 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div
          className="p-8 rounded-[28px]"
          style={{
            background: "#131826",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
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
                  placeholder="••••••••"
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
            </div>

            <div className="flex justify-end">
              <button type="button" className="text-hack-primary text-sm hover:text-hack-primary-hover transition-colors">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="hack-btn-primary w-full justify-center py-3 text-base"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Signing in...</>
              ) : (
                <><span>Sign In</span><ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-white/25 text-xs">or continue with</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="hack-btn-secondary justify-center py-3 gap-2">
              <Github size={16} />
              GitHub
            </button>
            <button className="hack-btn-secondary justify-center py-3 gap-2">
              <Linkedin size={16} />
              LinkedIn
            </button>
          </div>

          <p className="text-center text-white/40 text-sm mt-6">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="text-hack-primary hover:text-hack-primary-hover font-500">
              Sign up
            </Link>
          </p>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          By signing in, you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
}
