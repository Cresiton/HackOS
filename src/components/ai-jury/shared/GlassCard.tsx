import React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export function GlassCard({
  children,
  className,
  hoverEffect = false,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "bg-jury-card border border-jury-border rounded-[24px] backdrop-blur-[30px] p-6 shadow-lg",
        hoverEffect &&
          "transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(109,94,245,0.15)] hover:border-[rgba(255,255,255,0.15)] cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
