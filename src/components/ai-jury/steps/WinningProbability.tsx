import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "../shared/GlassCard";
import { Trophy, Download, Share2, Loader2, Target, ShieldAlert, Calendar, CheckCircle2 } from "lucide-react";
import { useAIJury } from "@/contexts/AIJuryContext";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export function WinningProbability({ onNext }: { onNext: () => void }) {
  const { analysisData, projectDetails } = useAIJury();
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  if (!analysisData) return null;

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    
    try {
      // Un-hide the report container
      reportRef.current.style.display = "block";
      
      const pages = reportRef.current.querySelectorAll('.pdf-page');
      let pdf: jsPDF | null = null;
      
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;
        const canvas = await html2canvas(pageEl, { scale: 2, useCORS: true, logging: false, width: 794 });
        const imgData = canvas.toDataURL("image/jpeg", 1.0);
        
        // Calculate true height based on scale 2
        const canvasHeight = canvas.height / 2;
        
        if (i === 0) {
          pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [794, canvasHeight] });
        } else if (pdf) {
          pdf.addPage([794, canvasHeight]);
        }
        
        if (pdf) {
          pdf.addImage(imgData, "JPEG", 0, 0, 794, canvasHeight);
        }
      }
      
      if (pdf) {
        pdf.save(`${projectDetails.name || "Project"}_AI_Jury_Report.pdf`);
      }
      
    } catch (e) {
      console.error("PDF Export failed", e);
      alert("Failed to export PDF. Please try again.");
    } finally {
      if (reportRef.current) reportRef.current.style.display = "none";
      setIsExporting(false);
    }
  };

  const levels = [
    { level: "Regional", prob: analysisData.probability.regional, color: "#00E676", text: "Highly likely to place in Top 3. Strong local problem focus." },
    { level: "National", prob: analysisData.probability.national, color: "#00D2FF", text: "Competitive. Needs better revenue model to secure first place." },
    { level: "International", prob: analysisData.probability.international, color: "#6D5EF5", text: "Good concept, but requires significant UI/UX polish to compete globally." }
  ];

  return (
    <div className="max-w-5xl mx-auto w-full pt-4 pb-12 flex flex-col h-full relative">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white mb-3">Winning Probability</h2>
        <p className="text-jury-text-secondary">Based on current project state and hackathon competition data.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {levels.map((item, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.2 }}
          >
            <GlassCard className="h-full flex flex-col items-center text-center p-8 relative overflow-hidden group">
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
                style={{ backgroundColor: item.color }}
              />
              <h3 className="text-xl font-bold text-white mb-6">{item.level}</h3>
              
              <div className="relative w-32 h-32 mb-6">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="56" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
                  <motion.circle 
                    cx="64" cy="64" r="56" fill="none" 
                    stroke={item.color} strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={351.86}
                    initial={{ strokeDashoffset: 351.86 }}
                    animate={{ strokeDashoffset: 351.86 - (351.86 * item.prob) / 100 }}
                    transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{item.prob}%</span>
                </div>
              </div>
              
              <p className="text-sm text-jury-text-secondary leading-relaxed">
                {item.text}
              </p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-auto"
      >
        <div className="bg-gradient-to-r from-jury-accent/20 to-jury-accent2/20 border border-jury-accent/30 rounded-[32px] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-jury-accent/20 rounded-full blur-[80px]" />
          
          <div className="relative z-10 text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Export Detailed AI Report</h2>
            <p className="text-jury-text-secondary max-w-xl text-lg">
              Get your comprehensive evaluation PDF. Includes deep metric reasoning, exact USP alternatives, red flags, and your full 6-week roadmap.
            </p>
          </div>
          
          <div className="relative z-10 flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <button 
              onClick={handleExportPDF}
              disabled={isExporting}
              className="px-8 py-4 bg-jury-accent hover:bg-jury-accent/90 disabled:opacity-50 text-white rounded-xl font-bold text-lg transition-all shadow-[0_0_20px_rgba(109,94,245,0.4)] flex items-center justify-center gap-2 w-full sm:w-auto hover:scale-105"
            >
              {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />} Download Full PDF
            </button>
            <button className="px-8 py-4 bg-jury-card hover:bg-jury-bg2 border border-jury-border text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 w-full sm:w-auto">
              <Share2 className="w-5 h-5" /> Share
            </button>
          </div>
        </div>
      </motion.div>

      {/* Hidden Printable Report Container */}
      <div ref={reportRef} style={{ display: "none" }} className="absolute top-0 left-0 w-[794px] opacity-0 pointer-events-none">
        
        {/* PAGE 1: Executive Summary & Overall Score */}
        <div className="pdf-page bg-white text-slate-900 w-[794px] min-h-[1123px] h-auto p-16 flex flex-col font-sans box-border">
          <div className="border-b-4 border-indigo-600 pb-10 mb-12 shrink-0">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-5xl font-extrabold text-slate-900 mb-4">{projectDetails.name || "Hackathon Project"}</h1>
                <p className="text-xl text-slate-600 font-medium">Domain: {projectDetails.domain} • Stage: {projectDetails.stage}</p>
              </div>
              <div className="text-right">
                <div className="text-6xl font-black text-indigo-600">{analysisData.overallScore}/100</div>
                <p className="text-lg text-slate-500 font-bold uppercase tracking-widest mt-2">Overall Score</p>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-6 text-indigo-900 border-l-4 border-indigo-600 pl-4">Executive Summary</h2>
            <div className="space-y-8">
              <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
                <h3 className="text-xl font-bold mb-3 text-slate-800">The Problem</h3>
                <p className="text-lg text-slate-600 leading-relaxed">{projectDetails.problem}</p>
              </div>
              <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
                <h3 className="text-xl font-bold mb-3 text-slate-800">The Solution</h3>
                <p className="text-lg text-slate-600 leading-relaxed">{projectDetails.solution}</p>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t-2 border-slate-200 text-center text-slate-400 font-medium shrink-0">Page 1 • Generated by HackOS</div>
        </div>

        {/* PAGE 2: USP & SWOT */}
        <div className="pdf-page bg-white text-slate-900 w-[794px] min-h-[1123px] h-auto p-16 flex flex-col font-sans box-border">
          <div className="flex-1 space-y-12">
            <div>
              <h2 className="text-2xl font-bold mb-6 text-indigo-900 flex items-center gap-3"><Target className="w-6 h-6 text-indigo-600" /> USP Analyzer</h2>
              <div className="bg-indigo-50 border border-indigo-100 p-8 rounded-2xl">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Current Evaluation ({analysisData.usp.status.toUpperCase()})</h3>
                <p className="text-base text-slate-700 mb-6">{analysisData.usp.current}</p>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Recommended Alternatives:</h3>
                <ul className="space-y-3">
                  {analysisData.usp.alternatives.map((alt, i) => (
                    <li key={i} className="flex gap-3 items-start bg-white p-4 rounded-xl border border-indigo-100">
                      <div className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm shrink-0">{i + 1}</div>
                      <p className="text-base text-slate-700">{alt}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-6 text-indigo-900 border-l-4 border-indigo-600 pl-4">SWOT Analysis</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200">
                  <h3 className="text-lg font-bold text-emerald-800 mb-3">Strengths</h3>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-emerald-900">{analysisData.swot.strengths.map((s,i)=><li key={i}>{s}</li>)}</ul>
                </div>
                <div className="bg-rose-50 p-6 rounded-xl border border-rose-200">
                  <h3 className="text-lg font-bold text-rose-800 mb-3">Weaknesses</h3>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-rose-900">{analysisData.swot.weaknesses.map((s,i)=><li key={i}>{s}</li>)}</ul>
                </div>
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                  <h3 className="text-lg font-bold text-blue-800 mb-3">Opportunities</h3>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-blue-900">{analysisData.swot.opportunities.map((s,i)=><li key={i}>{s}</li>)}</ul>
                </div>
                <div className="bg-amber-50 p-6 rounded-xl border border-amber-200">
                  <h3 className="text-lg font-bold text-amber-800 mb-3">Threats</h3>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-amber-900">{analysisData.swot.threats.map((s,i)=><li key={i}>{s}</li>)}</ul>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t-2 border-slate-200 text-center text-slate-400 font-medium shrink-0">Page 2 • Generated by HackOS</div>
        </div>

        {/* PAGE 3: Metrics & Red Flags */}
        <div className="pdf-page bg-white text-slate-900 w-[794px] min-h-[1123px] h-auto p-16 flex flex-col font-sans box-border">
          <div className="flex-1 space-y-12">
            <div>
              <h2 className="text-2xl font-bold mb-6 text-indigo-900 border-l-4 border-indigo-600 pl-4">Deep Dive Metrics Reasoning</h2>
              <div className="grid grid-cols-2 gap-4">
                {analysisData.metrics.map((m, i) => (
                  <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-base font-bold text-slate-800">{m.label}</h3>
                      <span className="text-lg font-black" style={{ color: m.color }}>{m.val}%</span>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">{m.reason}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-6 text-rose-600 flex items-center gap-3"><ShieldAlert className="w-6 h-6" /> Critical Red Flags & Blindspots</h2>
              <div className="bg-rose-50 border border-rose-200 p-6 rounded-xl space-y-3">
                {analysisData.redFlags.map((flag, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                    <p className="text-base text-rose-900 font-medium">{flag}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="pt-8 border-t-2 border-slate-200 text-center text-slate-400 font-medium shrink-0">Page 3 • Generated by HackOS</div>
        </div>

        {/* PAGE 4: Jury Panel */}
        <div className="pdf-page bg-white text-slate-900 w-[794px] min-h-[1123px] h-auto p-16 flex flex-col font-sans box-border">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-6 text-indigo-900 border-l-4 border-indigo-600 pl-4">Expert Jury Panel Feedback</h2>
            <div className="space-y-6">
              {analysisData.jurors.slice(0,4).map((j, i) => (
                <div key={i} className="border border-slate-200 bg-white p-5 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><span className="text-2xl">{j.avatar}</span> {j.role}</h3>
                    <div className="flex gap-3">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 border border-slate-200">PRIORITY: {j.priority}</span>
                      <span className="font-black" style={{ color: j.color }}>{j.score}/100</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 italic bg-slate-50 p-3 rounded-lg border border-slate-100 mb-3">"{j.feedback}"</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase">Focus Areas</h4>
                      <ul className="text-xs text-slate-700 list-disc pl-4 mt-1">{j.focusAreas?.map((f,idx)=><li key={idx}>{f}</li>) || <li>N/A</li>}</ul>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-rose-500 uppercase">Tough Questions</h4>
                      <ul className="text-xs text-slate-700 list-disc pl-4 mt-1">{j.questions?.map((q,idx)=><li key={idx}>{q}</li>) || <li>N/A</li>}</ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-8 border-t-2 border-slate-200 text-center text-slate-400 font-medium shrink-0">Page 4 • Generated by HackOS</div>
        </div>

        {/* PAGE 5: Roadmap */}
        <div className="pdf-page bg-white text-slate-900 w-[794px] min-h-[1123px] h-auto p-16 flex flex-col font-sans box-border">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-8 text-indigo-900 flex items-center gap-3"><Calendar className="w-6 h-6 text-indigo-600" /> 6-Week Execution Roadmap</h2>
            <div className="space-y-6">
              {analysisData.roadmap.map((week, idx) => (
                <div key={idx} className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex gap-6">
                  <div className="w-24 shrink-0 border-r border-slate-200 pr-4">
                    <div className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Week {week.week}</div>
                    <div className="text-base font-black text-slate-800 leading-tight">{week.title}</div>
                  </div>
                  <div className="flex-1">
                    <ul className="flex flex-col gap-2">
                      {week.tasks.map((task, tIdx) => (
                        <li key={tIdx} className="text-sm text-slate-700 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-8 border-t-2 border-slate-200 text-center text-slate-400 font-medium shrink-0">Page 5 • Generated by HackOS</div>
        </div>

      </div>
    </div>
  );
}
