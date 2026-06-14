import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "../shared/GlassCard";
import { Mic, Send, AlertCircle, Loader2, StopCircle } from "lucide-react";
import { useAIJury } from "@/contexts/AIJuryContext";
import { callGroq } from "@/lib/groq";

export function MockQuestionRound({ onNext }: { onNext: () => void }) {
  const { projectDetails, analysisData } = useAIJury();
  const [question, setQuestion] = useState("");
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(true);
  
  const [answer, setAnswer] = useState("");
  const [isListening, setIsListening] = useState(false);
  
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<null | {
    logic: number;
    confidence: number;
    business: number;
    feedback: string;
  }>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Generate dynamic question
    const fetchQuestion = async () => {
      if (!analysisData) return;
      try {
        const prompt = `Project: ${projectDetails.name}\nProblem: ${projectDetails.problem}\nWeaknesses: ${analysisData.swot.weaknesses.join(", ")}\n\nGenerate ONE tough, specific mock jury interview question for this hackathon project. Do not include quotes or intro text.`;
        const res = await callGroq([
          { role: "system", content: "You are a tough Startup Investor Judge." },
          { role: "user", content: prompt }
        ]);
        setQuestion(res.trim());
      } catch (e) {
        setQuestion("How do you plan to acquire your first 100 users with zero marketing budget?");
      } finally {
        setIsGeneratingQuestion(false);
      }
    };
    fetchQuestion();
  }, [analysisData, projectDetails]);

  const toggleListen = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Speech Recognition. Please type your answer.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setAnswer(prev => prev + (prev ? " " : "") + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    setIsListening(true);
  };

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    if (isListening) toggleListen();
    setIsEvaluating(true);
    
    try {
      const prompt = `Question: ${question}\nUser's Answer: ${answer}\n\nEvaluate the answer for a hackathon pitch. Return ONLY valid JSON:
{"logic": number (0-100), "confidence": number (0-100), "business": number (0-100), "feedback": "string (3-4 sentences of harsh but constructive feedback)"}`;
      
      const res = await callGroq([
        { role: "system", content: "You are a tough Startup Investor Judge. Always return valid JSON." },
        { role: "user", content: prompt }
      ]);
      
      const jsonStr = res.replace(/```json/g, "").replace(/```/g, "").trim();
      setEvaluation(JSON.parse(jsonStr));
    } catch (e) {
      setEvaluation({
        logic: 75, confidence: 80, business: 60,
        feedback: "Your answer had good logic but lacked a solid business justification. Ensure you back up your claims with data next time."
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full pt-4 pb-12 flex flex-col min-h-[60vh]">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-3">Mock Jury Interview</h2>
        <p className="text-jury-text-secondary">Answer on the spot. Practice makes perfect.</p>
      </div>

      <AnimatePresence mode="wait">
        {!evaluation ? (
          <motion.div 
            key="question"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
          >
            <GlassCard className="p-8 mb-6 border-jury-warning/30 bg-gradient-to-br from-jury-card to-jury-warning/5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-jury-warning/20 rounded-full flex items-center justify-center shrink-0 border border-jury-warning/30">
                  <AlertCircle className="w-6 h-6 text-jury-warning" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-jury-warning uppercase tracking-wider mb-2">Question from Investor</h3>
                  {isGeneratingQuestion ? (
                    <div className="flex items-center gap-2 text-jury-text-secondary text-xl font-medium">
                      <Loader2 className="w-5 h-5 animate-spin text-jury-warning" /> Generating specific question...
                    </div>
                  ) : (
                    <p className="text-xl md:text-2xl font-medium text-white leading-relaxed">
                      "{question}"
                    </p>
                  )}
                </div>
              </div>
            </GlassCard>

            <div className="relative flex-1 flex flex-col bg-jury-bg2 border border-jury-border rounded-[32px] overflow-hidden group focus-within:border-jury-accent transition-colors">
              <textarea 
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer here, or click the mic to speak..."
                className="flex-1 w-full bg-transparent text-white p-6 md:p-8 text-lg focus:outline-none resize-none placeholder:text-jury-text-muted"
                disabled={isEvaluating || isGeneratingQuestion}
              />
              
              <div className="absolute bottom-6 right-6 flex items-center gap-3">
                <button 
                  onClick={toggleListen}
                  disabled={isEvaluating || isGeneratingQuestion}
                  className={`p-4 rounded-full transition-all flex items-center justify-center ${isListening ? 'bg-jury-danger text-white animate-pulse' : 'bg-jury-card border border-jury-border text-jury-text-secondary hover:text-white hover:border-jury-accent'}`}
                >
                  {isListening ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={!answer.trim() || isEvaluating || isGeneratingQuestion}
                  className="px-6 py-4 bg-jury-accent hover:bg-jury-accent/90 disabled:opacity-50 disabled:hover:bg-jury-accent text-white rounded-full font-bold transition-all shadow-[0_0_20px_rgba(109,94,245,0.3)] flex items-center gap-2"
                >
                  {isEvaluating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Submit Answer</>}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="evaluation"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col"
          >
            <GlassCard className="p-8 md:p-12 border-jury-success/30 bg-gradient-to-br from-jury-card to-jury-success/5 h-full flex flex-col">
              <h3 className="text-2xl font-bold text-white mb-8 text-center">Answer Evaluation</h3>
              
              <div className="grid grid-cols-3 gap-4 mb-10">
                {[
                  { label: "Logic", score: evaluation.logic, color: "#00D2FF" },
                  { label: "Confidence", score: evaluation.confidence, color: "#00E676" },
                  { label: "Business Sense", score: evaluation.business, color: "#FFB300" }
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col items-center bg-jury-bg2 rounded-2xl p-4 border border-jury-border">
                    <div className="text-3xl font-bold text-white mb-2" style={{ color: stat.color }}>{stat.score}%</div>
                    <span className="text-xs text-jury-text-secondary uppercase tracking-wider font-semibold text-center">{stat.label}</span>
                  </div>
                ))}
              </div>

              <div className="bg-jury-bg border border-jury-border rounded-2xl p-6 mb-8 flex-1">
                <h4 className="text-sm font-bold text-jury-text-muted uppercase tracking-wider mb-3">AI Feedback</h4>
                <p className="text-white leading-relaxed md:text-lg">
                  "{evaluation.feedback}"
                </p>
              </div>

              <button 
                onClick={onNext}
                className="w-full py-4 bg-jury-accent hover:bg-jury-accent/90 text-white rounded-xl font-bold text-lg transition-all shadow-[0_0_20px_rgba(109,94,245,0.4)]"
              >
                Continue to Next Phase
              </button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
