import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, File, CheckCircle2, Loader2, Play, FileText } from "lucide-react";
import { GlassCard } from "../shared/GlassCard";
import { useAIJury } from "@/contexts/AIJuryContext";
import { useDropzone } from "react-dropzone";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";

// Need to set the worker source for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const EXTRACTION_STEPS = [
  "Reading Problem Statement",
  "Analyzing Documents",
  "Understanding Architecture",
  "Finding USP",
  "Checking Market",
  "Evaluating Creativity",
  "Evaluating Scalability",
  "Building Jury Report"
];

export function UploadCenter({ onNext }: { onNext: () => void }) {
  const { setExtractedText, extractedText, setParsedSlides, evaluateProject, isEvaluating, analysisData } = useAIJury();
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [fileName, setFileName] = useState("");

  const extractPdfText = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = "";
      let slidesArray: string[] = [];
      const maxPages = Math.min(pdf.numPages, 10);
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(" ");
        text += `\n--- Page ${i} ---\n` + pageText + "\n";
        slidesArray.push(pageText);
      }
      setParsedSlides(slidesArray);
      return text;
    } catch (e) {
      console.error("PDF extraction error", e);
      return "Could not extract text from PDF.";
    }
  };

  const extractPptxText = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = new JSZip();
      const contents = await zip.loadAsync(arrayBuffer);
      let text = "";
      let slidesArray: string[] = [];

      const slideFiles = Object.keys(contents.files).filter(
        (path) => path.startsWith("ppt/slides/slide") && path.endsWith(".xml")
      );

      // Sort slides by number
      slideFiles.sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || "0");
        const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || "0");
        return numA - numB;
      });

      for (const [index, slidePath] of slideFiles.entries()) {
        const slideXml = await contents.files[slidePath].async("string");
        const regex = /<a:t>([^<]*)<\/a:t>/g;
        let match;
        let slideText = "";
        while ((match = regex.exec(slideXml)) !== null) {
          slideText += match[1] + " ";
        }
        if (slideText.trim()) {
          text += `\n--- Slide ${index + 1} ---\n${slideText.trim()}\n`;
          slidesArray.push(slideText.trim());
        }
      }
      setParsedSlides(slidesArray);
      return text || "No text found in presentation slides.";
    } catch (e: any) {
      console.error("PPTX extraction error", e);
      return `Could not extract text from PPTX. Error: ${e.message || e}`;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setFileName(file.name);
    setIsUploading(true);

    let text = "";
    if (file.type === "application/pdf") {
      text = await extractPdfText(file);
    } else if (file.name.toLowerCase().endsWith(".pptx")) {
      text = await extractPptxText(file);
    } else {
      text = await file.text();
    }

    setExtractedText(text);
    setIsUploading(false);
    setShowPreview(true);
  }, [setExtractedText]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const startEvaluation = async () => {
    setShowPreview(false);
    setIsProcessing(true);
    await evaluateProject();
  };

  useEffect(() => {
    if (isProcessing) {
      let step = 0;
      const interval = setInterval(() => {
        if (step < EXTRACTION_STEPS.length - 1) {
          setCompletedSteps(prev => [...prev, step]);
          step++;
        }
      }, 1500);

      if (analysisData) {
        clearInterval(interval);
        setCompletedSteps(EXTRACTION_STEPS.map((_, i) => i));
        setTimeout(() => onNext(), 1000);
      }

      return () => clearInterval(interval);
    }
  }, [isProcessing, analysisData, onNext]);

  return (
    <div className="max-w-4xl mx-auto w-full pt-8 pb-12 flex flex-col items-center justify-center min-h-[60vh]">
      
      <AnimatePresence mode="wait">
        {!showPreview && !isProcessing && (
          <motion.div 
            key="upload"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Upload Documents</h2>
              <p className="text-jury-text-secondary">Provide your pitch deck (PPTX/PDF), codebase, or business plan for deep analysis.</p>
            </div>

            <div 
              {...getRootProps()}
              className={`border-2 border-dashed rounded-[32px] p-12 flex flex-col items-center justify-center bg-jury-card hover:bg-jury-accent/5 cursor-pointer transition-all hover:border-jury-accent hover:shadow-[0_0_30px_rgba(109,94,245,0.15)] group ${isDragActive ? 'border-jury-accent bg-jury-accent/10' : 'border-jury-accent/50'}`}
            >
              <input {...getInputProps()} />
              <div className="w-20 h-20 bg-jury-bg rounded-full flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                {isUploading ? (
                  <Loader2 className="w-10 h-10 text-jury-accent animate-spin" />
                ) : (
                  <UploadCloud className="w-10 h-10 text-jury-accent" />
                )}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {isUploading ? "Uploading & Extracting..." : isDragActive ? "Drop the file here" : "Drag & Drop files here"}
              </h3>
              <p className="text-jury-text-muted text-sm mb-6 text-center max-w-sm">
                Accepts PPTX, PDF, TXT, MD.
              </p>
              
              <div className="flex gap-3">
                <span className="px-4 py-2 rounded-xl bg-jury-bg2 border border-jury-border text-xs text-jury-text-secondary">Real-time Extraction</span>
                <span className="px-4 py-2 rounded-xl bg-jury-bg2 border border-jury-border text-xs text-jury-text-secondary">Secure & Private</span>
              </div>
            </div>
          </motion.div>
        )}

        {showPreview && (
          <motion.div 
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full"
          >
            <GlassCard className="p-8 flex flex-col h-[60vh]">
              <div className="flex items-center gap-4 mb-6 border-b border-jury-border pb-4">
                <div className="w-12 h-12 bg-jury-success/20 rounded-xl flex items-center justify-center border border-jury-success/30">
                  <FileText className="w-6 h-6 text-jury-success" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">Data Extracted Successfully <CheckCircle2 className="w-5 h-5 text-jury-success" /></h3>
                  <p className="text-sm text-jury-text-secondary">File: {fileName} | Characters: {extractedText.length}</p>
                </div>
              </div>

              <div className="flex-1 bg-jury-bg2 border border-jury-border rounded-2xl p-6 overflow-y-auto custom-scrollbar mb-6">
                <h4 className="text-sm font-bold text-jury-text-muted uppercase tracking-wider mb-4 sticky top-0 bg-jury-bg2 py-2">Raw Extracted Text</h4>
                <pre className="text-white whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {extractedText}
                </pre>
              </div>

              <div className="flex justify-end gap-4">
                <button 
                  onClick={() => setShowPreview(false)}
                  className="px-6 py-3 bg-jury-bg2 border border-jury-border text-white rounded-xl hover:bg-jury-card transition-colors"
                >
                  Upload Another
                </button>
                <button 
                  onClick={startEvaluation}
                  className="px-8 py-3 bg-jury-accent hover:bg-jury-accent/90 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(109,94,245,0.4)] flex items-center gap-2"
                >
                  <Play className="w-5 h-5" /> Start AI Evaluation
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {isProcessing && (
          <motion.div 
            key="processing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xl"
          >
            <GlassCard className="p-8">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-jury-border">
                <div className="w-14 h-14 bg-jury-accent/20 rounded-2xl flex items-center justify-center border border-jury-accent/30">
                  <File className="w-7 h-7 text-jury-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{fileName || "Project_Details.pdf"}</h3>
                  <p className="text-sm text-jury-text-secondary">Analyzing with AI Jury...</p>
                </div>
                {isEvaluating && <div className="ml-auto w-10 h-10 border-2 border-jury-accent border-t-transparent rounded-full animate-spin" />}
              </div>

              <div className="space-y-4">
                {EXTRACTION_STEPS.map((step, idx) => {
                  const isCompleted = completedSteps.includes(idx) || !!analysisData;
                  const isActive = !isCompleted && completedSteps.length === idx && isEvaluating;
                  
                  return (
                    <div key={idx} className={`flex items-center gap-3 ${isCompleted ? 'opacity-100' : isActive ? 'opacity-100' : 'opacity-40'}`}>
                      {isCompleted ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <CheckCircle2 className="w-5 h-5 text-jury-success" />
                        </motion.div>
                      ) : isActive ? (
                        <div className="w-5 h-5 border-2 border-jury-accent border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-jury-border bg-jury-bg2" />
                      )}
                      <span className={`text-sm ${isCompleted ? 'text-jury-success' : isActive ? 'text-white' : 'text-jury-text-muted'}`}>
                        {step}
                      </span>
                      {isActive && (
                        <motion.span 
                          animate={{ opacity: [0, 1, 0] }} 
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="ml-auto text-xs text-jury-accent"
                        >
                          Processing via Groq
                        </motion.span>
                      )}
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
