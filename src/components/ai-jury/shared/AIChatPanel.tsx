import React, { useState } from "react";
import { motion } from "framer-motion";
import { Send, Brain, Sparkles } from "lucide-react";

export function AIChatPanel() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "ai",
      content: "Hello! I am your AI Jury Mentor. Ask me anything about your project's business model, tech stack, or pitch.",
    },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg = { id: Date.now(), role: "user", content: input };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");

    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "ai",
          content: "That's a great question. Based on your uploaded documents, focusing on your Unique Selling Point will strengthen your pitch significantly.",
        },
      ]);
    }, 1000);
  };

  return (
    <div className="w-80 border-l border-jury-border bg-jury-bg2/50 backdrop-blur-md flex flex-col h-full">
      <div className="p-4 border-b border-jury-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-jury-accent/20 flex items-center justify-center border border-jury-accent/30">
          <Brain className="w-5 h-5 text-jury-accent2" />
        </div>
        <div>
          <h3 className="font-semibold text-white">AI Mentor</h3>
          <p className="text-xs text-jury-success flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-jury-success animate-pulse" />
            Online
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                msg.role === "user"
                  ? "bg-jury-accent text-white rounded-tr-sm"
                  : "bg-jury-card border border-jury-border text-jury-text-secondary rounded-tl-sm"
              }`}
            >
              {msg.content}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-4 border-t border-jury-border bg-jury-bg">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask AI Jury..."
            className="w-full bg-jury-bg2 border border-jury-border rounded-full py-3 pl-4 pr-12 text-sm text-white placeholder-jury-text-muted focus:outline-none focus:border-jury-accent focus:ring-1 focus:ring-jury-accent transition-all"
          />
          <button
            onClick={handleSend}
            className="absolute right-2 w-8 h-8 rounded-full bg-jury-accent hover:bg-jury-accent/80 flex items-center justify-center transition-colors"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-center gap-1 text-[10px] text-jury-text-muted">
          <Sparkles className="w-3 h-3" /> AI can make mistakes. Review carefully.
        </div>
      </div>
    </div>
  );
}
