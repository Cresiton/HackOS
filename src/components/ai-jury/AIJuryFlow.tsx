import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

import { AIChatPanel } from "./shared/AIChatPanel";
import { OpeningScreen } from "./steps/OpeningScreen";
import { ProjectDetails } from "./steps/ProjectDetails";
import { UploadCenter } from "./steps/UploadCenter";
import { AnalyticsDashboard } from "./steps/AnalyticsDashboard";
import { AIJuryPanel } from "./steps/AIJuryPanel";
import { MockQuestionRound } from "./steps/MockQuestionRound";
import { PresentationReview } from "./steps/PresentationReview";
import { Roadmap } from "./steps/Roadmap";
import { WinningProbability } from "./steps/WinningProbability";

const STEPS = [
  { id: "opening", title: "Welcome" },
  { id: "project", title: "Project" },
  { id: "documents", title: "Documents" },
  { id: "analytics", title: "Analysis" },
  { id: "panel", title: "AI Review" },
  { id: "mock", title: "Mock Jury" },
  { id: "presentation", title: "Presentation" },
  { id: "roadmap", title: "Roadmap" },
  { id: "probability", title: "Probability" },
];

export function AIJuryFlow({ onClose }: { onClose: () => void }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const nextStep = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const renderStep = () => {
    switch (currentStepIndex) {
      case 0: return <OpeningScreen onNext={nextStep} />;
      case 1: return <ProjectDetails onNext={nextStep} />;
      case 2: return <UploadCenter onNext={nextStep} />;
      case 3: return <AnalyticsDashboard onNext={nextStep} />;
      case 4: return <AIJuryPanel onNext={nextStep} />;
      case 5: return <MockQuestionRound onNext={nextStep} />;
      case 6: return <PresentationReview onNext={nextStep} />;
      case 7: return <Roadmap onNext={nextStep} />;
      case 8: return <WinningProbability onNext={nextStep} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-full w-full bg-jury-bg overflow-hidden relative">
      <div className="flex-1 flex flex-col h-full relative z-10">
        
        {/* Top Progress Bar */}
        {currentStepIndex > 0 && (
          <div className="h-16 border-b border-jury-border flex items-center justify-between px-8 bg-jury-bg/80 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-2">
              {STEPS.slice(1).map((step, idx) => {
                const stepNum = idx + 1;
                const isActive = stepNum === currentStepIndex;
                const isPast = stepNum < currentStepIndex;
                return (
                  <React.Fragment key={step.id}>
                    <div className={`flex items-center gap-2 ${isActive ? 'text-white' : isPast ? 'text-jury-success' : 'text-jury-text-muted'} text-sm font-medium transition-colors`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isActive ? 'bg-jury-accent text-white' : isPast ? 'bg-jury-success/20 text-jury-success' : 'bg-jury-card border border-jury-border'}`}>
                        {isPast ? '✓' : stepNum}
                      </span>
                      <span className="hidden md:inline-block">{step.title}</span>
                    </div>
                    {idx < STEPS.length - 2 && (
                      <div className={`w-8 h-[2px] rounded-full ${isPast ? 'bg-jury-success' : 'bg-jury-border'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-jury-card rounded-full transition-colors">
              <X className="w-5 h-5 text-jury-text-secondary" />
            </button>
          </div>
        )}

        {currentStepIndex === 0 && (
          <button onClick={onClose} className="absolute top-6 right-6 p-2 z-50 bg-jury-card/50 hover:bg-jury-card backdrop-blur-md rounded-full border border-jury-border transition-colors">
            <X className="w-6 h-6 text-white" />
          </button>
        )}

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="min-h-full flex flex-col p-8"
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Navigation */}
        {currentStepIndex > 0 && currentStepIndex < STEPS.length - 1 && (
          <div className="h-20 border-t border-jury-border flex items-center justify-between px-8 bg-jury-bg shrink-0">
            <button
              onClick={prevStep}
              className="px-6 py-2.5 rounded-full border border-jury-border text-white hover:bg-jury-card transition-colors flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={nextStep}
              className="px-6 py-2.5 rounded-full bg-jury-accent hover:bg-jury-accent/80 text-white font-medium transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(109,94,245,0.4)]"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Right AI Chat Panel */}
      {currentStepIndex > 1 && (
        <AnimatePresence>
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="h-full shrink-0 z-20"
          >
            <AIChatPanel />
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
