"use client";

import { cn } from "@/lib/utils";

type AnimatedWrapperProps = {
  children: React.ReactNode;
  className?: string;
};

export function AnimatedWrapper({ children, className }: AnimatedWrapperProps) {
  return (
    <div className={cn("animate-fade-in", className)}>
      {children}
    </div>
  );
}
