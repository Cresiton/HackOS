import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "../shared/GlassCard";
import { Sparkles, ArrowRight, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { useAIJury } from "@/contexts/AIJuryContext";
import { callGroq } from "@/lib/groq";

export function PresentationReview({ onNext }: { onNext: () => void }) {
  const { projectDetails, parsedSlides } = useAIJury();
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [betterSlide, setBetterSlide] = useState<string | null>(null);

  // If there are no slides, fall back to project problem/solution
  const slideContent = parsedSlides && parsedSlides.length > 0 
    ? parsedSlides[selectedSlideIndex] 
    : `Problem: ${projectDetails.problem}\nSolution: ${projectDetails.solution}`;

  const handleGenerateBetterSlide = async () => {
    setIsGenerating(true);
    setBetterSlide(null);
    try {
      const prompt = `Project: ${projectDetails.name}\nContext: ${projectDetails.domain}\n\nHere is the raw text from one of the user's presentation slides:\n"${slideContent}"\n\nRewrite this as a highly impactful, concise 3-bullet-point slide for an investor presentation. Focus on punchy storytelling and reducing cognitive load. Do not include intro text, just the slide content.`;
      
      const res = await callGroq([
        { role: "system", content: "You are an expert presentation coach for startups." },
        { role: "user", content: prompt }
      ]);
      setBetterSlide(res.trim());
    } catch (e) {
      setBetterSlide("Failed to generate. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full pt-4 pb-12 flex flex-col h-full">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white mb-3">Slide Content Analysis</h2>
        <p className="text-jury-text-secondary">AI analysis of your presentation's storytelling, hierarchy, and cognitive load.</p>
      </div>

      {parsedSlides && parsedSlides.length > 0 && (
        <div className="flex overflow-x-auto gap-4 mb-8 custom-scrollbar pb-4 px-2">
          {parsedSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelectedSlideIndex(idx);
                setBetterSlide(null); // Reset suggestion when changing slides
              }}
              className={`whitespace-nowrap px-6 py-3 rounded-full font-bold transition-all ${
                selectedSlideIndex === idx 
                  ? "bg-jury-accent text-white shadow-[0_0_15px_rgba(109,94,245,0.4)]" 
                  : "bg-jury-bg2 border border-jury-border text-jury-text-secondary hover:text-white"
              }`}
            >
              Slide {idx + 1}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Original Extracted Slide */}
        <motion.div key={`original-${selectedSlideIndex}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <GlassCard className="h-full border-jury-border relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 bg-jury-border text-jury-text-secondary px-4 py-1 rounded-bl-xl text-sm font-bold flex items-center gap-1">
              Extracted Raw Text
            </div>
            
            <h3 className="text-lg font-bold text-white mb-6">Your Slide Content</h3>
            
            <div className="flex-1 bg-jury-bg2 border border-jury-border rounded-xl p-8 mb-6 overflow-y-auto custom-scrollbar min-h-[300px]">
              {parsedSlides && parsedSlides.length > 0 ? (
                <pre className="text-white font-sans whitespace-pre-wrap leading-relaxed text-sm">
                  {slideContent}
                </pre>
              ) : (
                <div className="text-center text-jury-text-muted pt-20">
                  <p className="mb-2">No slides extracted.</p>
                  <p className="text-xs">Falling back to basic project details.</p>
                  <pre className="text-white font-sans whitespace-pre-wrap leading-relaxed mt-6 text-left">
                    {slideContent}
                  </pre>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Improved Slide Example */}
        <motion.div key={`improved-${selectedSlideIndex}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, duration: 0.3 }}>
          <GlassCard className="h-full border-jury-success/30 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 bg-jury-success/20 text-jury-success px-4 py-1 rounded-bl-xl text-sm font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> AI Suggestion
            </div>
            
            <h3 className="text-lg font-bold text-white mb-6">Optimized Structure</h3>
            
            <div className="flex-1 bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A] rounded-xl p-8 shadow-inner border border-white/10 relative overflow-hidden flex items-center justify-center min-h-[300px]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-jury-accent/20 rounded-full blur-[50px]" />
              
              <AnimatePresence mode="wait">
                {isGenerating ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
                    <RefreshCw className="w-10 h-10 text-jury-accent animate-spin mb-4" />
                    <p className="text-jury-text-secondary text-sm animate-pulse">Analyzing storytelling and hierarchy...</p>
                  </motion.div>
                ) : !betterSlide ? (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-jury-text-muted">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50 text-jury-warning" />
                    <p>Click "Generate Better Slide" to see an AI-optimized <br/> version of this specific content.</p>
                  </motion.div>
                ) : (
                  <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full text-white text-lg font-medium whitespace-pre-wrap relative z-10 leading-relaxed">
                    {betterSlide}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </GlassCard>
        </motion.div>

      </div>

      <div className="flex justify-between items-center mt-auto">
        <button 
          onClick={handleGenerateBetterSlide}
          disabled={isGenerating}
          className="px-6 py-3 rounded-xl bg-jury-bg2 border border-jury-border text-white hover:bg-jury-card transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isGenerating ? <Loader2 className="w-5 h-5 animate-spin text-jury-warning" /> : <Sparkles className="w-5 h-5 text-jury-warning" />}
          Generate Better Slide
        </button>
        <button 
          onClick={onNext}
          className="px-8 py-3 bg-jury-accent hover:bg-jury-accent/90 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(109,94,245,0.4)] flex items-center gap-2"
        >
          Next: Roadmap <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
