import React from "react";
import { motion } from "framer-motion";
import { Brain, FileText, BarChart3, Presentation, Compass } from "lucide-react";

export function OpeningScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Particles/Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-jury-accent/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-jury-accent2/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Floating Elements */}
      <motion.div
        animate={{ y: [-10, 10, -10], rotate: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-16 h-16 bg-jury-card border border-jury-border rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-md hidden md:flex"
      >
        <FileText className="w-6 h-6 text-jury-accent" />
      </motion.div>
      <motion.div
        animate={{ y: [10, -10, 10], rotate: [0, -5, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-1/4 right-1/4 w-20 h-20 bg-jury-card border border-jury-border rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-md hidden md:flex"
      >
        <BarChart3 className="w-8 h-8 text-jury-success" />
      </motion.div>
      <motion.div
        animate={{ y: [-15, 15, -15], rotate: [0, 10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/3 right-1/4 w-14 h-14 bg-jury-card border border-jury-border rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-md hidden md:flex"
      >
        <Presentation className="w-6 h-6 text-jury-warning" />
      </motion.div>
      <motion.div
        animate={{ y: [15, -15, 15], rotate: [0, -10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-1/3 left-1/4 w-12 h-12 bg-jury-card border border-jury-border rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-md hidden md:flex"
      >
        <Compass className="w-5 h-5 text-jury-accent2" />
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, type: "spring" }}
        className="relative z-10 flex flex-col items-center text-center max-w-3xl"
      >
        <div className="w-32 h-32 mb-8 relative">
          <div className="absolute inset-0 bg-jury-accent blur-[30px] opacity-40 rounded-full animate-pulse-glow" />
          <div className="w-full h-full bg-jury-card border border-jury-border rounded-full flex items-center justify-center backdrop-blur-md shadow-2xl relative z-10">
            <Brain className="w-16 h-16 text-white animate-jury-float" />
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
          Meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-jury-accent to-jury-accent2">AI Jury</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-jury-text-secondary leading-relaxed mb-12 max-w-2xl">
          Your Personal Hackathon Judge, <br className="hidden md:block" />
          Mentor, Investor, Product Expert, <br className="hidden md:block" />
          and Pitch Coach.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={onNext}
            className="px-8 py-4 bg-jury-accent hover:bg-jury-accent/90 text-white rounded-full font-semibold text-lg transition-all shadow-[0_0_20px_rgba(109,94,245,0.4)] hover:shadow-[0_0_30px_rgba(109,94,245,0.6)] hover:scale-105 flex items-center gap-2"
          >
            Start Evaluation
          </button>
        </div>
      </motion.div>
    </div>
  );
}
