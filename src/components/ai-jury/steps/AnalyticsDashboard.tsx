import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { GlassCard } from "../shared/GlassCard";
import { AnimatedRing } from "../shared/AnimatedRing";
import { AlertTriangle, TrendingUp, ShieldAlert, Zap, Search, Target, Copy, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { useAIJury } from "@/contexts/AIJuryContext";
import { callGroq } from "@/lib/groq";

export function AnalyticsDashboard({ onNext }: { onNext: () => void }) {
  const { analysisData, projectDetails } = useAIJury();
  const [fixingFlag, setFixingFlag] = useState<string | null>(null);
  const [fixedStrategies, setFixedStrategies] = useState<Record<string, string>>({});

  if (!analysisData) {
    return <div className="text-white text-center py-20">No analysis data found. Please go back and upload documents.</div>;
  }

  const handleFixNow = async (flag: string) => {
    setFixingFlag(flag);
    try {
      const prompt = `Project: ${projectDetails.name}\nProblem: ${projectDetails.problem}\nSolution: ${projectDetails.solution}\nRed Flag identified: "${flag}"\n\nProvide a concise, highly actionable 2-3 sentence strategy to fix this red flag for a hackathon pitch.`;
      const res = await callGroq([
        { role: "system", content: "You are an expert startup advisor." },
        { role: "user", content: prompt }
      ]);
      setFixedStrategies(prev => ({ ...prev, [flag]: res }));
    } catch (e) {
      setFixedStrategies(prev => ({ ...prev, [flag]: "Failed to generate strategy. Please try again." }));
    } finally {
      setFixingFlag(null);
    }
  };

  return (
    <div className="w-full pb-12 space-y-8">
      
      {/* Hero Header Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Overall Score Hero Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="h-full flex flex-col items-center justify-center p-8 bg-gradient-to-b from-jury-card to-jury-bg2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-jury-accent to-jury-accent2" />
            <h3 className="text-jury-text-secondary font-medium mb-6 uppercase tracking-widest text-sm">Overall Score</h3>
            <AnimatedRing percentage={analysisData.overallScore} size={160} strokeWidth={12} color="#6D5EF5" />
            <div className="mt-6 text-center">
              <h2 className="text-2xl font-bold text-white">
                {analysisData.overallScore >= 90 ? "Excellent" : analysisData.overallScore >= 75 ? "Good" : "Needs Work"}
              </h2>
              <p className="text-jury-success font-medium flex items-center justify-center gap-1 mt-1">
                <TrendingUp className="w-4 h-4" /> Top {100 - analysisData.overallScore}% of projects
              </p>
            </div>
          </GlassCard>
        </motion.div>

        {/* 2x4 Grid Metrics */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {analysisData.metrics.map((stat, i) => (
            <motion.div key={i} whileHover={{ scale: 1.05, zIndex: 10 }} className="relative h-full">
              <GlassCard className="p-4 flex flex-col items-center justify-center text-center h-full group overflow-hidden transition-all duration-500 border border-jury-border hover:border-jury-accent/50 cursor-default">
                
                {/* Default State */}
                <div className="flex flex-col items-center justify-center w-full h-full transform transition-all duration-500 group-hover:-translate-y-4 group-hover:opacity-0 group-hover:blur-sm">
                  <AnimatedRing percentage={stat.val} size={60} strokeWidth={4} color={stat.color || "#6D5EF5"} valueText=" " />
                  <div className="mt-[-40px] text-lg font-bold text-white mb-4">{stat.val}%</div>
                  <span className="text-xs text-jury-text-secondary font-medium uppercase tracking-wider">{stat.label}</span>
                </div>
                
                {/* Hover State - Reasoning */}
                <div className="absolute inset-0 p-4 flex flex-col items-center justify-center text-center opacity-0 group-hover:opacity-100 transform translate-y-8 group-hover:translate-y-0 transition-all duration-500 bg-[#050816]/95 backdrop-blur-md rounded-2xl border border-jury-accent/30 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                  <span className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: stat.color || "#6D5EF5" }}>
                    {stat.label} • {stat.val}%
                  </span>
                  <p className="text-xs text-white/90 leading-relaxed font-medium">
                    {stat.reason || "Analysis completed based on current project data."}
                  </p>
                </div>
                
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Creativity Radar */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard className="h-full">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Creativity Analysis</h3>
                <p className="text-sm text-jury-text-muted mt-1">Compared against 1000+ hackathon projects</p>
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={analysisData.creativity}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Project" dataKey="A" stroke="#6D5EF5" strokeWidth={2} fill="#6D5EF5" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>

        {/* USP Analyzer */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard className="h-full flex flex-col">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-jury-accent2" /> USP Analyzer
            </h3>
            
            <div className="bg-jury-bg2 border border-jury-border rounded-2xl p-5 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${analysisData.usp.status === 'missing' ? 'bg-jury-danger/20' : analysisData.usp.status === 'excellent' ? 'bg-jury-success/20' : 'bg-jury-warning/20'}`}>
                  {analysisData.usp.status === 'missing' ? <XIcon className="w-4 h-4 text-jury-danger" /> : <CheckCircle2 className={`w-4 h-4 ${analysisData.usp.status === 'excellent' ? 'text-jury-success' : 'text-jury-warning'}`} />}
                </div>
                <span className={`font-semibold capitalize ${analysisData.usp.status === 'missing' ? 'text-jury-danger' : analysisData.usp.status === 'excellent' ? 'text-jury-success' : 'text-jury-warning'}`}>
                  Unique Selling Point: {analysisData.usp.status}
                </span>
              </div>
              <p className="text-sm text-jury-text-secondary leading-relaxed">
                {analysisData.usp.current}
              </p>
            </div>

            <div className="flex-1">
              <p className="text-xs text-jury-text-muted uppercase tracking-wider font-semibold mb-3">AI Generated Alternatives</p>
              <div className="space-y-3">
                {analysisData.usp.alternatives.map((usp, i) => (
                  <div key={i} className="group bg-jury-card border border-jury-border hover:border-jury-accent/50 rounded-xl p-4 flex gap-3 items-start transition-colors">
                    <Zap className="w-4 h-4 text-jury-warning shrink-0 mt-0.5" />
                    <p className="text-sm text-white flex-1">{usp}</p>
                    <button className="text-jury-text-muted hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* SWOT & Red Flags */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* SWOT */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-2">
          <GlassCard>
            <h3 className="text-xl font-bold text-white mb-6">SWOT Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-jury-success/10 border border-jury-success/20">
                <h4 className="text-jury-success font-bold mb-3 flex items-center gap-2">S - Strengths</h4>
                <ul className="text-sm text-jury-text-secondary space-y-2 list-disc list-inside">
                  {analysisData.swot.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div className="p-5 rounded-2xl bg-jury-danger/10 border border-jury-danger/20">
                <h4 className="text-jury-danger font-bold mb-3 flex items-center gap-2">W - Weaknesses</h4>
                <ul className="text-sm text-jury-text-secondary space-y-2 list-disc list-inside">
                  {analysisData.swot.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
              <div className="p-5 rounded-2xl bg-jury-accent2/10 border border-jury-accent2/20">
                <h4 className="text-jury-accent2 font-bold mb-3 flex items-center gap-2">O - Opportunities</h4>
                <ul className="text-sm text-jury-text-secondary space-y-2 list-disc list-inside">
                  {analysisData.swot.opportunities.map((o, i) => <li key={i}>{o}</li>)}
                </ul>
              </div>
              <div className="p-5 rounded-2xl bg-jury-warning/10 border border-jury-warning/20">
                <h4 className="text-jury-warning font-bold mb-3 flex items-center gap-2">T - Threats</h4>
                <ul className="text-sm text-jury-text-secondary space-y-2 list-disc list-inside">
                  {analysisData.swot.threats.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Red Flags */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <GlassCard className="h-full bg-[#1A0B10] border-jury-danger/20">
            <h3 className="text-xl font-bold text-jury-danger mb-6 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> Red Flags
            </h3>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-jury-danger/50 before:to-transparent">
              {analysisData.redFlags.map((flag, i) => (
                <div key={i} className="relative flex flex-col bg-jury-danger/10 border border-jury-danger/30 rounded-xl p-4 ml-8">
                  <div className="absolute -left-10 w-4 h-4 rounded-full bg-jury-danger border-4 border-[#1A0B10] mt-1" />
                  
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-white">{flag}</span>
                    {!fixedStrategies[flag] && (
                      <button 
                        onClick={() => handleFixNow(flag)}
                        disabled={fixingFlag === flag}
                        className="text-xs px-3 py-1.5 bg-jury-danger text-white rounded-lg hover:bg-jury-danger/80 transition-colors shrink-0 flex items-center gap-1"
                      >
                        {fixingFlag === flag ? <Loader2 className="w-3 h-3 animate-spin" /> : "Fix Now"}
                      </button>
                    )}
                  </div>
                  
                  <AnimatePresence>
                    {fixedStrategies[flag] && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 pt-3 border-t border-jury-danger/20"
                      >
                        <p className="text-xs text-jury-success mb-1 font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> AI Strategy:</p>
                        <p className="text-xs text-white/80">{fixedStrategies[flag]}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

      </div>
    </div>
  );
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}
