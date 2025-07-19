// project/src/components/ui/Input.tsx
import React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  helperText?: string;
}

// Use React.forwardRef to allow refs to be passed to the underlying input element
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, helperText, className, ...props }, ref) => { // 'ref' is now available
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-black">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <div className="text-secondary-500">
                {icon}
              </div>
            </div>
          )}
          <input
            ref={ref} // Attach the ref to the actual input element
            className={cn(
              "w-full px-3 py-2 bg-card-500 border border-background-400 rounded-lg",
              "text-black placeholder-secondary-400",
              "focus:ring-2 focus:ring-secondary-500 focus:border-transparent",
              "transition-all duration-300",
              icon ? "pl-10" : "",
              error ? "border-error-500 focus:ring-error-500" : "",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-sm text-error-500">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-secondary-500">{helperText}</p>
        )}
      </div>
    );
  }
);

// Add a display name for better debugging in React DevTools
Input.displayName = 'Input';
