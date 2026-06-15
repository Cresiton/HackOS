import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from "framer-motion";
import { MatchProfile } from "@/lib/matchService";
import DeveloperCard from "./DeveloperCard";
import { X, Heart, Bookmark } from "lucide-react";

interface SwipeDeckProps {
  profiles: MatchProfile[];
  onSwipe: (direction: "left" | "right", profile: MatchProfile) => void;
  onSave: (profile: MatchProfile) => void;
  onInvite: (profile: MatchProfile) => void;
  onEmpty: () => void;
  showInviteButton: boolean;
}

const SWIPE_THRESHOLD = 120;

export default function SwipeDeck({ profiles, onSwipe, onSave, onInvite, onEmpty, showInviteButton }: SwipeDeckProps) {
  const [deck, setDeck] = useState<MatchProfile[]>(profiles);
  const activeCardRef = useRef<HTMLDivElement>(null);

  // When props update (like when mutual match resumes and gives new profiles), sync state
  useEffect(() => {
    setDeck(profiles);
  }, [profiles]);

  useEffect(() => {
    if (deck.length === 0) {
      onEmpty();
    }
  }, [deck, onEmpty]);

  const removeTopCard = (direction: "left" | "right") => {
    const active = deck[0];
    if (!active) return;
    
    setDeck((prev) => prev.slice(1));
    onSwipe(direction, active);
  };

  const handleButtonSwipe = (direction: "left" | "right") => {
    // A little hack to trigger the animation out before actually removing the card
    // We will just do state update immediately for button clicks for simplicity, 
    // but in a real app we'd animate the card out first.
    removeTopCard(direction);
  };

  if (deck.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto h-[70vh] relative">
      <div className="relative w-full h-[65vh] perspective-1000">
        {deck.slice(0, 3).reverse().map((profile, index) => {
          // The slice gives us [0,1,2]. Reversed it's [2,1,0].
          // The last element in the mapped array is index 2, which corresponds to deck[0] (the top card).
          // We need to calculate its visual index from the top.
          const isTop = profile.id === deck[0].id;
          const visualIndex = deck.indexOf(profile); // 0, 1, or 2

          return (
            <Card
              key={profile.id}
              profile={profile}
              isTop={isTop}
              visualIndex={visualIndex}
              onSwipe={removeTopCard}
              onSave={() => onSave(profile)}
              onInvite={() => onInvite(profile)}
              showInvite={showInviteButton}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-6 mt-8">
        <button
          onClick={() => handleButtonSwipe("left")}
          className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/50 text-red-500 flex items-center justify-center hover:bg-red-500/20 hover:scale-110 transition-all shadow-lg"
        >
          <X size={24} />
        </button>
        <button
          onClick={() => onSave(deck[0])}
          className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/50 text-blue-400 flex items-center justify-center hover:bg-blue-500/20 hover:scale-110 transition-all shadow-lg"
        >
          <Bookmark size={20} />
        </button>
        <button
          onClick={() => handleButtonSwipe("right")}
          className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/50 text-green-500 flex items-center justify-center hover:bg-green-500/20 hover:scale-110 transition-all shadow-lg"
        >
          <Heart size={24} />
        </button>
      </div>

      <div className="absolute -bottom-10 text-white/40 text-sm font-medium">
        {deck.length} Developer{deck.length !== 1 && 's'} Remaining
      </div>
    </div>
  );
}

interface CardProps {
  profile: MatchProfile;
  isTop: boolean;
  visualIndex: number;
  onSwipe: (dir: "left" | "right") => void;
  onSave: () => void;
  onInvite: () => void;
  showInvite: boolean;
}

function Card({ profile, isTop, visualIndex, onSwipe, onSave, onInvite, showInvite }: CardProps) {
  const x = useMotionValue(0);
  const controls = useAnimation();

  // Rotates between -15deg and 15deg as x moves between -200 and 200
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  
  // Opacity of "SKIP" and "INTERESTED" overlays
  const skipOpacity = useTransform(x, [0, -150], [0, 1]);
  const interestedOpacity = useTransform(x, [0, 150], [0, 1]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      controls.start({ x: 500, opacity: 0, transition: { duration: 0.3 } }).then(() => onSwipe("right"));
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      controls.start({ x: -500, opacity: 0, transition: { duration: 0.3 } }).then(() => onSwipe("left"));
    } else {
      controls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 20 } });
    }
  };

  // Stack effects
  const scale = isTop ? 1 : 1 - visualIndex * 0.05;
  const yOffset = isTop ? 0 : visualIndex * 15;

  useEffect(() => {
    controls.start({ scale, opacity: 1, y: yOffset, transition: { duration: 0.4, ease: "easeOut" } });
  }, [scale, yOffset, controls]);

  return (
    <motion.div
      className="absolute top-0 left-0 w-full h-full transform-gpu"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        zIndex: 10 - visualIndex,
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      animate={controls}
      whileTap={isTop ? { cursor: "grabbing" } : undefined}
      initial={{ scale: 0.8, opacity: 0, y: 50 }}
    >
      <div className="w-full h-full relative cursor-grab active:cursor-grabbing">
        <DeveloperCard 
          profile={profile} 
          onSave={onSave} 
          onInvite={onInvite} 
          showInvite={showInvite} 
        />

        {/* Swipe Overlays */}
        <motion.div
          style={{ opacity: interestedOpacity }}
          className="absolute inset-0 bg-green-500/20 border-4 border-green-500 rounded-3xl flex items-center justify-center z-50 pointer-events-none"
        >
          <div className="px-6 py-2 border-4 border-green-500 text-green-500 font-black text-4xl rounded-xl transform -rotate-12 tracking-widest bg-black/50 backdrop-blur-sm">
            INTERESTED
          </div>
        </motion.div>

        <motion.div
          style={{ opacity: skipOpacity }}
          className="absolute inset-0 bg-red-500/20 border-4 border-red-500 rounded-3xl flex items-center justify-center z-50 pointer-events-none"
        >
          <div className="px-6 py-2 border-4 border-red-500 text-red-500 font-black text-4xl rounded-xl transform rotate-12 tracking-widest bg-black/50 backdrop-blur-sm">
            SKIP
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
