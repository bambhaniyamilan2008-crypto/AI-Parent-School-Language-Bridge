
"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

type BackButtonProps = {
  onClick?: () => void;
  className?: string;
};

/**
 * A robust back button that handles navigation safety.
 * Behaves like a true browser back button with a fallback to home.
 */
export function BackButton({ onClick, className }: BackButtonProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleBack = useCallback(() => {
    // If a custom onClick is provided (e.g., for step-based onboarding), use it.
    if (onClick) {
      onClick();
      return;
    }

    // Otherwise, use browser history logic
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }, [onClick, router]);

  // ESC key support for back navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleBack();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleBack]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleBack}
      aria-label="Go back"
      className={cn(
        "rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md hover:bg-white transition-all duration-300 active:scale-90 h-10 w-10 border border-black/5",
        className
      )}
    >
      <ArrowLeft className="size-6 text-foreground" />
    </Button>
  );
}
