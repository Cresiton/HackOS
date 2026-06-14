import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";

export interface MatchFilters {
  roles: string[];
  availability: "Available Only" | "Everyone";
  location?: string;
  minTrustScore?: number;
}

interface MatchPreferencesProps {
  onComplete: (filters: MatchFilters) => void;
  onSkip: () => void;
}

const ROLES = [
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "AI Engineer",
  "UI Designer",
  "Mobile Developer",
  "DevOps Engineer",
  "Data Scientist",
  "Blockchain Developer",
  "Presenter",
  "Student"
];

export default function MatchPreferences({ onComplete, onSkip }: MatchPreferencesProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [availability, setAvailability] = useState<"Available Only" | "Everyone">("Available Only");

  const handleRoleToggle = (role: string) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter(r => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const handleContinue = () => {
    onComplete({
      roles: selectedRoles,
      availability
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto px-4 py-8"
    >
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Set Your Preferences</h2>
        <p className="text-white/60">Help us find the perfect match for you</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md mb-8">
        <h3 className="text-lg font-medium text-white mb-4">Preferred Roles</h3>
        <div className="flex flex-wrap gap-2 mb-8">
          {ROLES.map((role) => {
            const isSelected = selectedRoles.includes(role);
            return (
              <button
                key={role}
                onClick={() => handleRoleToggle(role)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 flex items-center gap-2
                  ${isSelected 
                    ? "bg-hack-primary/20 border-hack-primary text-hack-primary" 
                    : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                  }`}
              >
                {isSelected && <Check size={14} />}
                {role}
              </button>
            );
          })}
        </div>

        <h3 className="text-lg font-medium text-white mb-4">Availability</h3>
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setAvailability("Available Only")}
            className={`flex-1 py-3 px-4 rounded-xl border transition-all duration-200 ${
              availability === "Available Only"
                ? "bg-green-500/10 border-green-500/50 text-green-400"
                : "bg-white/5 border-white/10 text-white/50"
            }`}
          >
            Available Only
          </button>
          <button
            onClick={() => setAvailability("Everyone")}
            className={`flex-1 py-3 px-4 rounded-xl border transition-all duration-200 ${
              availability === "Everyone"
                ? "bg-blue-500/10 border-blue-500/50 text-blue-400"
                : "bg-white/5 border-white/10 text-white/50"
            }`}
          >
            Everyone
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button 
          onClick={onSkip}
          className="px-6 py-3 text-white/50 hover:text-white transition-colors"
        >
          Skip Filters
        </button>
        <button 
          onClick={handleContinue}
          className="px-8 py-3 bg-hack-primary text-black font-semibold rounded-xl hover:bg-hack-primary/90 transition-all flex items-center gap-2"
        >
          Continue
          <ChevronRight size={18} />
        </button>
      </div>
    </motion.div>
  );
}
