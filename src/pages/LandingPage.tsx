import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Users, Zap, Trophy, Shield, Star, Activity,
  CheckCircle, Github, Linkedin, ChevronRight
} from "lucide-react";
import heroIllustration from "@/assets/hero-illustration.png";

const FEATURES = [
  {
    icon: Zap,
    title: "AI Team Builder",
    description: "Transform your idea into the perfect squad using advanced AI.",
    color: "#7C5CFF",
  },
  {
    icon: Users,
    title: "Intelligent Matching",
    description: "Find teammates based on skills, trust, and availability.",
    color: "#4F7CFF",
  },
  {
    icon: Trophy,
    title: "Organizer Center",
    description: "Host and manage hackathons effortlessly from one hub.",
    color: "#22C55E",
  },
  {
    icon: Shield,
    title: "Trust Score",
    description: "Stand out with verified achievements and integrations.",
    color: "#F59E0B",
  },
  {
    icon: Activity,
    title: "Real-Time Collaboration",
    description: "Build together without switching platforms ever again.",
    color: "#4F7CFF",
  },
  {
    icon: Star,
    title: "Active Requests",
    description: "Discover team opportunities and collaborations instantly.",
    color: "#7C5CFF",
  },
];

const STATS = [
  { value: "12,000+", label: "Active Builders" },
  { value: "850+", label: "Hackathons Hosted" },
  { value: "3,200+", label: "Teams Formed" },
  { value: "₹2Cr+", label: "Prize Pool Won" },
];

export default function LandingPage() {
  const [featureIndex, setFeatureIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFeatureIndex((prev) => (prev + 1) % FEATURES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "#06070B", fontFamily: "Inter, sans-serif" }}
    >
      {/* Left: Vision Board */}
      <div className="flex-1 relative overflow-hidden flex flex-col justify-between p-12 lg:p-16">
        {/* Background gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 40%, rgba(124,92,255,0.08) 0%, transparent 60%)",
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
            style={{ background: "linear-gradient(135deg, #7C5CFF, #4F7CFF)" }}
          >
            H
          </div>
          <div>
            <div className="font-bold text-white text-xl">HackOS</div>
            <div className="text-white/30 text-xs">Build together. Win together.</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative max-w-2xl">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-sm font-500"
            style={{
              background: "rgba(124,92,255,0.12)",
              border: "1px solid rgba(124,92,255,0.25)",
              color: "#A78BFF",
            }}
          >
            <Zap size={13} />
            AI-Powered Hackathon Operating System
          </div>

          <h1 className="text-5xl lg:text-6xl font-800 text-white leading-tight mb-6">
            The Complete OS for{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #7C5CFF 0%, #4F7CFF 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Hackathons
            </span>
          </h1>

          <p className="text-white/50 text-lg leading-relaxed mb-10 max-w-xl">
            Build teams. Discover opportunities. Organize events. Collaborate smarter.
            Everything a builder needs, in one intelligent platform.
          </p>

          {/* Rotating Feature */}
          <div
            className="mb-10 p-5 rounded-2xl transition-all duration-500"
            style={{
              background: "rgba(19,24,38,0.8)",
              border: "1px solid rgba(255,255,255,0.07)",
              minHeight: "90px",
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${FEATURES[featureIndex].color}20`, border: `1px solid ${FEATURES[featureIndex].color}30` }}
              >
                {(() => {
                  const Icon = FEATURES[featureIndex].icon;
                  return <Icon size={18} style={{ color: FEATURES[featureIndex].color }} />;
                })()}
              </div>
              <div>
                <div className="text-white font-600 mb-1">{FEATURES[featureIndex].title}</div>
                <div className="text-white/50 text-sm">{FEATURES[featureIndex].description}</div>
              </div>
            </div>
            <div className="flex gap-1 mt-4">
              {FEATURES.map((_, i) => (
                <div
                  key={i}
                  className="transition-all duration-300 rounded-full"
                  style={{
                    height: "3px",
                    width: i === featureIndex ? "24px" : "6px",
                    background: i === featureIndex ? "#7C5CFF" : "rgba(255,255,255,0.15)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-10">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <div className="text-white font-700 text-xl">{stat.value}</div>
                <div className="text-white/40 text-xs mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Live activity */}
          <div className="flex items-center gap-6 text-sm text-white/40">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-hack-green animate-pulse" />
              <span>238 teams formed this week</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-hack-primary animate-pulse" />
              <span>1,024 builders online</span>
            </div>
          </div>
        </div>

        {/* Hero Illustration */}
        <div className="absolute right-0 bottom-0 w-1/2 opacity-30 pointer-events-none">
          <img src={heroIllustration} alt="HackOS Platform" className="w-full object-cover" />
        </div>

        {/* Footer */}
        <div className="relative flex items-center gap-6 text-xs text-white/25">
          <span>© 2026 HackOS</span>
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
          <span>Community Guidelines</span>
        </div>
      </div>

      {/* Right: Auth Container */}
      <div
        className="w-full max-w-md flex flex-col justify-center p-8 lg:p-12"
        style={{
          background: "rgba(14,17,27,0.9)",
          borderLeft: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="p-8 rounded-[28px]"
          style={{
            background: "rgba(19,24,38,0.8)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4"
              style={{ background: "linear-gradient(135deg, #7C5CFF, #4F7CFF)" }}
            >
              H
            </div>
            <h2 className="text-white font-700 text-2xl">Welcome to HackOS</h2>
            <p className="text-white/40 text-sm mt-2">Join the builders shaping tomorrow.</p>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3 mb-6">
            <Link to="/signup" className="block">
              <button className="hack-btn-primary w-full justify-center py-3 text-base">
                Get Started Free
                <ArrowRight size={16} />
              </button>
            </Link>
            <Link to="/login" className="block">
              <button className="hack-btn-secondary w-full justify-center py-3 text-base">
                Sign In
              </button>
            </Link>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-white/25 text-xs">or continue with</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* Social Auth */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Github, label: "GitHub" },
              { icon: Linkedin, label: "LinkedIn" },
              {
                icon: () => (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                ),
                label: "Google"
              },
            ].map((provider) => (
              <button
                key={provider.label}
                className="hack-btn-secondary justify-center py-3"
                onClick={() => {}}
              >
                <provider.icon size={16} />
              </button>
            ))}
          </div>

          {/* Trust indicators */}
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-white/25">
            {["Trust Score", "AI Powered", "Free to Join"].map((item) => (
              <div key={item} className="flex items-center gap-1">
                <CheckCircle size={10} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
