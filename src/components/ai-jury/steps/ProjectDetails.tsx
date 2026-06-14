import React from "react";
import { GlassCard } from "../shared/GlassCard";
import { motion } from "framer-motion";
import { useAIJury } from "@/contexts/AIJuryContext";

export function ProjectDetails({ onNext }: { onNext: () => void }) {
  const { projectDetails, setProjectDetails } = useAIJury();

  const handleChange = (field: string, value: string) => {
    setProjectDetails(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto w-full pt-4 pb-12">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white mb-3">Project Details</h2>
        <p className="text-jury-text-secondary">Provide some context so the AI Jury can evaluate you better.</p>
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="space-y-6"
      >
        <GlassCard>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-jury-text-secondary">Project Name</label>
              <input 
                type="text" 
                value={projectDetails.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. HackOS" 
                className="w-full bg-jury-bg2 border border-jury-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-jury-accent transition-colors" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-jury-text-secondary">Domain</label>
              <select 
                value={projectDetails.domain}
                onChange={(e) => handleChange('domain', e.target.value)}
                className="w-full bg-jury-bg2 border border-jury-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-jury-accent transition-colors appearance-none"
              >
                <option>Fintech</option>
                <option>EdTech</option>
                <option>HealthTech</option>
                <option>Web3 / Crypto</option>
                <option>AI / ML</option>
                <option>Other</option>
              </select>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-jury-text-secondary">Problem Statement</label>
              <textarea 
                value={projectDetails.problem}
                onChange={(e) => handleChange('problem', e.target.value)}
                rows={3} 
                placeholder="What problem are you solving?" 
                className="w-full bg-jury-bg2 border border-jury-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-jury-accent transition-colors resize-none" 
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-jury-text-secondary">Solution</label>
              <textarea 
                value={projectDetails.solution}
                onChange={(e) => handleChange('solution', e.target.value)}
                rows={3} 
                placeholder="How does your project solve it?" 
                className="w-full bg-jury-bg2 border border-jury-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-jury-accent transition-colors resize-none" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-jury-text-secondary">Tech Stack</label>
              <input 
                type="text" 
                value={projectDetails.techStack}
                onChange={(e) => handleChange('techStack', e.target.value)}
                placeholder="React, Node, MongoDB..." 
                className="w-full bg-jury-bg2 border border-jury-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-jury-accent transition-colors" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-jury-text-secondary">Target Audience</label>
              <input 
                type="text" 
                value={projectDetails.targetAudience}
                onChange={(e) => handleChange('targetAudience', e.target.value)}
                placeholder="e.g. College Students" 
                className="w-full bg-jury-bg2 border border-jury-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-jury-accent transition-colors" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-jury-text-secondary">Hackathon Level</label>
              <div className="flex gap-3">
                {['Regional', 'National', 'International'].map(level => (
                  <label key={level} className="flex-1 cursor-pointer">
                    <input 
                      type="radio" 
                      name="level" 
                      value={level}
                      checked={projectDetails.level === level}
                      onChange={(e) => handleChange('level', e.target.value)}
                      className="peer sr-only" 
                    />
                    <div className="text-center py-2 px-3 rounded-xl border border-jury-border bg-jury-bg2 text-jury-text-muted peer-checked:bg-jury-accent/20 peer-checked:border-jury-accent peer-checked:text-jury-accent transition-all text-sm">
                      {level}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-jury-text-secondary">Development Stage</label>
              <div className="flex gap-3">
                {['Idea', 'Prototype', 'MVP', 'Production'].map(stage => (
                  <label key={stage} className="flex-1 cursor-pointer">
                    <input 
                      type="radio" 
                      name="stage" 
                      value={stage}
                      checked={projectDetails.stage === stage}
                      onChange={(e) => handleChange('stage', e.target.value)}
                      className="peer sr-only" 
                    />
                    <div className="text-center py-2 px-3 rounded-xl border border-jury-border bg-jury-bg2 text-jury-text-muted peer-checked:bg-jury-accent/20 peer-checked:border-jury-accent peer-checked:text-jury-accent transition-all text-sm">
                      {stage}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
