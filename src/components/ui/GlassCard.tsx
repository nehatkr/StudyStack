import React from 'react';
import { cn } from '../../utils/cn';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'subtle';
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  variant = 'default',
  onClick,
}) => {
  const baseClasses = "backdrop-blur-md rounded-2xl border transition-all duration-300";
  
  const variants = {
    default: "bg-white/15 dark:bg-black/15 border-white/20 dark:border-gray-600/20",
    elevated: "bg-white/20 dark:bg-black/20 border-white/30 dark:border-gray-600/30 shadow-lg",
    subtle: "bg-white/10 dark:bg-black/10 border-white/10 dark:border-gray-600/10",
  };

  const hoverClasses = onClick ? "hover:bg-white/25 dark:hover:bg-black/25 cursor-pointer hover:shadow-xl hover:scale-[1.02]" : "";

  return (
    <div
      className={cn(baseClasses, variants[variant], hoverClasses, className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
};