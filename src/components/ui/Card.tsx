import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'interactive';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  onClick,
}) => {
  const baseClasses = "bg-card-500 rounded-lg border border-background-300 transition-all duration-300";
  
  const variants = {
    default: "shadow-sm hover:shadow-md transition-shadow duration-300",
    elevated: "shadow-lg hover:shadow-xl transition-shadow duration-300",
    interactive: "shadow-sm hover:shadow-lg cursor-pointer transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 hover:shadow-secondary-500/10",
  };

  return (
    <div
      className={cn(baseClasses, variants[variant], className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
};