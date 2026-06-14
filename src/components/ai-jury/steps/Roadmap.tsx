import React from "react";
import { motion } from "framer-motion";
import { GlassCard } from "../shared/GlassCard";
import { Calendar, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { useAIJury } from "@/contexts/AIJuryContext";

export function Roadmap({ onNext }: { onNext: () => void }) {
  const { analysisData } = useAIJury();

  if (!analysisData || !analysisData.roadmap) return null;

  return (
    <div className="max-w-4xl mx-auto w-full pt-4 pb-12 flex flex-col h-full">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white mb-3">6-Week Execution Roadmap</h2>
        <p className="text-jury-text-secondary">AI-generated timeline based on your current gaps and hackathon requirements.</p>
      </div>

      <div className="flex-1 space-y-6 relative before:absolute before:inset-0 before:ml-5 md:before:mx-auto md:before:translate-x-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-jury-accent before:via-jury-accent2 before:to-jury-border">
        {analysisData.roadmap.map((week, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group ${idx % 2 === 0 ? 'md:left-timeline' : 'md:right-timeline'}`}
          >
            {/* Timeline Node */}
            <div className={`absolute left-0 md:left-1/2 -translate-x-1/2 w-10 h-10 rounded-full border-4 border-[#050816] flex items-center justify-center z-10 ${
              week.status === 'completed' ? 'bg-jury-success' : 
              week.status === 'current' ? 'bg-jury-accent shadow-[0_0_15px_rgba(109,94,245,0.6)]' : 'bg-jury-border'
            }`}>
              {week.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-black" /> : 
               week.status === 'current' ? <div className="w-3 h-3 bg-white rounded-full animate-pulse" /> : 
               <Circle className="w-3 h-3 text-jury-text-muted" />}
            </div>

            {/* Content Card */}
            <GlassCard className={`ml-12 md:ml-0 w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-6 transition-all duration-300 ${
              week.status === 'current' ? 'border-jury-accent/50 shadow-[0_0_30px_rgba(109,94,245,0.15)]' : 'hover:border-jury-text-muted'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className={`w-4 h-4 ${week.status === 'current' ? 'text-jury-accent' : 'text-jury-text-secondary'}`} />
                <span className={`text-sm font-bold uppercase tracking-wider ${week.status === 'current' ? 'text-jury-accent' : 'text-jury-text-secondary'}`}>
                  Week {week.week}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-4">{week.title}</h3>
              <ul className="space-y-2">
                {week.tasks.map((task, tIdx) => (
                  <li key={tIdx} className="flex items-start gap-2 text-sm text-jury-text-secondary">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${week.status === 'completed' ? 'bg-jury-success' : week.status === 'current' ? 'bg-jury-accent' : 'bg-jury-text-muted'}`} />
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-end mt-12">
        <button 
          onClick={onNext}
          className="px-8 py-3 bg-jury-accent hover:bg-jury-accent/90 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(109,94,245,0.4)] flex items-center gap-2"
        >
          Final Verdict <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
