import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "../shared/GlassCard";
import { Star, ShieldAlert, Target, Zap } from "lucide-react";
import { useAIJury } from "@/contexts/AIJuryContext";

export function AIJuryPanel({ onNext }: { onNext: () => void }) {
  const { analysisData } = useAIJury();
  const [activeIndex, setActiveIndex] = useState(0);

  if (!analysisData) return null;

  const activeJuror = analysisData.jurors[activeIndex];

  return (
    <div className="max-w-6xl mx-auto w-full pt-4 pb-12 flex flex-col h-full">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white mb-3">Jury Deliberation Room</h2>
        <p className="text-jury-text-secondary">Select a judge to review their deep analysis and anticipated questions.</p>
      </div>

      {/* Juror Avatars (Tabs) */}
      <div className="flex justify-center gap-4 sm:gap-8 mb-12 flex-wrap">
        {analysisData.jurors.map((juror, idx) => {
          const isActive = activeIndex === idx;
          return (
            <div key={idx} className="flex flex-col items-center">
              <button
                onClick={() => setActiveIndex(idx)}
                className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-4xl sm:text-5xl transition-all duration-300 shadow-lg group
                  ${isActive ? "scale-110 z-10" : "scale-90 opacity-70 hover:opacity-100 hover:scale-100"}`}
                style={{
                  backgroundColor: isActive ? "var(--jury-card)" : "var(--jury-bg2)",
                  border: `4px solid ${isActive ? juror.color : "transparent"}`
                }}
              >
                {/* Glow Effect */}
                {isActive && (
                  <div 
                    className="absolute inset-0 rounded-full blur-[20px] -z-10"
                    style={{ backgroundColor: juror.color, opacity: 0.4 }}
                  />
                )}
                {juror.avatar}
              </button>
              
              <div className={`mt-3 text-sm font-bold transition-colors ${isActive ? "text-white" : "text-jury-text-muted"}`}>
                {juror.role}
              </div>
              <div className="flex items-center gap-1 text-xs mt-1 bg-jury-bg2 px-2 py-0.5 rounded-full border border-jury-border">
                <Star className="w-3 h-3 text-jury-warning fill-jury-warning" /> 
                <span className="text-white font-semibold">{juror.score}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deep Detail Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="flex-1"
        >
          <GlassCard className="relative overflow-hidden h-full flex flex-col p-8 sm:p-10 border" style={{ borderColor: `${activeJuror.color}40` }}>
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-20 pointer-events-none" style={{ backgroundColor: activeJuror.color }} />
            
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-white mb-2">{activeJuror.role} Review</h3>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-jury-bg2 border border-jury-border text-xs font-bold uppercase tracking-widest" style={{ color: activeJuror.color }}>
                  Priority Level: {activeJuror.priority}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A] p-6 rounded-2xl border border-white/5 mb-8 relative z-10 shadow-inner">
              <p className="text-lg sm:text-xl text-white/90 leading-relaxed font-medium italic">
                "{activeJuror.feedback}"
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 flex-1">
              {/* Focus Areas */}
              <div className="bg-jury-bg2/50 p-6 rounded-2xl border border-jury-border">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5" style={{ color: activeJuror.color }} /> Core Focus Areas
                </h4>
                <ul className="space-y-3">
                  {activeJuror.focusAreas?.map((area, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: activeJuror.color }} />
                      <span className="text-jury-text-secondary font-medium">{area}</span>
                    </li>
                  )) || <li className="text-jury-text-muted text-sm">Please re-run analysis to generate.</li>}
                </ul>
              </div>

              {/* Anticipated Questions */}
              <div className="bg-jury-danger/5 p-6 rounded-2xl border border-jury-danger/20">
                <h4 className="text-lg font-bold text-jury-danger mb-4 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" /> Tough Questions to Prepare For
                </h4>
                <div className="space-y-4">
                  {activeJuror.questions?.map((q, i) => (
                    <div key={i} className="bg-jury-danger/10 border border-jury-danger/20 p-4 rounded-xl flex gap-3 items-start">
                      <Zap className="w-4 h-4 text-jury-danger shrink-0 mt-0.5" />
                      <p className="text-white/90 text-sm font-medium leading-relaxed">{q}</p>
                    </div>
                  )) || <div className="text-jury-danger/50 text-sm">Please re-run analysis to generate.</div>}
                </div>
              </div>
            </div>
            
          </GlassCard>
        </motion.div>
      </AnimatePresence>
      
      <div className="flex justify-end mt-8">
        <button 
          onClick={onNext}
          className="px-8 py-3 bg-jury-accent hover:bg-jury-accent/90 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(109,94,245,0.4)]"
        >
          Next: Mock Jury
        </button>
      </div>
    </div>
  );
}
