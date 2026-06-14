import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AIJuryFlow } from "./AIJuryFlow";

interface AIJuryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIJuryModal({ isOpen, onClose }: AIJuryModalProps) {
  // Prevent scrolling on the body when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-[20px]"
            onClick={onClose}
          />
          
          {/* Main Modal Container - Bottom Sheet / Full Screen Hybrid */}
          <motion.div
            initial={{ y: "100%", opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-0 w-full md:w-[95%] lg:w-[90%] xl:w-[85%] h-[95vh] md:h-[90vh] bg-jury-bg rounded-t-[32px] md:rounded-[32px] md:bottom-auto border border-jury-border shadow-[0_0_100px_rgba(109,94,245,0.15)] overflow-hidden flex flex-col"
          >
            <AIJuryFlow onClose={onClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
