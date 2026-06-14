import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain } from "lucide-react";
import { AIJuryModal } from "./AIJuryModal";
import { AIJuryProvider } from "@/contexts/AIJuryContext";

export function AIJuryFloatingButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      <div className="fixed bottom-8 left-8 z-50 flex items-center">
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: -10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10, scale: 0.9 }}
              className="absolute left-20 bg-jury-card backdrop-blur-md border border-jury-border text-white text-sm px-4 py-2 rounded-2xl shadow-xl whitespace-nowrap z-40 pointer-events-none"
            >
              <div className="font-bold mb-0.5">🧠 AI Jury</div>
              <div className="text-jury-text-muted text-xs">Practice before the real judges.</div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.button
          onClick={() => setIsModalOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-[70px] h-[70px] rounded-full bg-gradient-to-br from-[#1a1b2e] to-[#0A0D16] border border-[rgba(109,94,245,0.4)] shadow-[0_0_30px_rgba(109,94,245,0.3)] flex items-center justify-center z-50 group"
        >
          {/* Animated Glow Behind */}
          <div className="absolute inset-0 rounded-full bg-jury-accent blur-[15px] opacity-40 group-hover:opacity-70 transition-opacity duration-500 animate-pulse-glow" />
          
          <div className="relative z-10 w-full h-full rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm border border-white/10">
            <Brain className="w-8 h-8 text-jury-accent2 animate-jury-float" />
          </div>
        </motion.button>
      </div>

      <AIJuryProvider>
        <AIJuryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </AIJuryProvider>
    </>
  );
}
