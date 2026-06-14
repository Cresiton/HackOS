import { motion } from "framer-motion";
import { Search, Users, Compass, CalendarCheck } from "lucide-react";

export type MatchMode = "find_teammates" | "recruit" | "explore" | "registered";

interface MatchModeSelectorProps {
  onSelect: (mode: MatchMode) => void;
}

export default function MatchModeSelector({ onSelect }: MatchModeSelectorProps) {
  const modes = [
    {
      id: "find_teammates",
      title: "Find Teammates",
      description: "Discover developers suitable for your next hackathon.",
      icon: Search,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      border: "hover:border-blue-500/50",
    },
    {
      id: "recruit",
      title: "Recruit for My Team",
      description: "Select an existing team and recruit for vacant roles.",
      icon: Users,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
      border: "hover:border-purple-500/50",
    },
    {
      id: "explore",
      title: "Explore Developers",
      description: "Browse developers without specific requirements.",
      icon: Compass,
      color: "text-green-400",
      bg: "bg-green-400/10",
      border: "hover:border-green-500/50",
    },
    {
      id: "registered",
      title: "Registered Participants",
      description: "Find developers registered for the same hackathons as you.",
      icon: CalendarCheck,
      color: "text-orange-400",
      bg: "bg-orange-400/10",
      border: "hover:border-orange-500/50",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-2xl mx-auto px-4 py-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="text-3xl font-bold text-white mb-3">HackOS Match</h1>
        <p className="text-white/60 text-lg">What would you like to do today?</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        {modes.map((mode, index) => {
          const Icon = mode.icon;
          return (
            <motion.button
              key={mode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onSelect(mode.id as MatchMode)}
              className={`flex flex-col items-start p-6 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md transition-all duration-300 text-left group ${mode.border} hover:bg-white/10`}
            >
              <div className={`p-3 rounded-xl mb-4 transition-colors ${mode.bg} ${mode.color}`}>
                <Icon size={24} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{mode.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{mode.description}</p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
