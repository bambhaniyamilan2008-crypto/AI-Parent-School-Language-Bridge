
"use client";

import { Heart } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full pt-12 pb-8 mt-auto relative z-0 clear-both">
      <div className="flex flex-col items-center justify-center gap-5 opacity-40 hover:opacity-100 transition-all duration-700">
        <div className="flex flex-col items-center gap-2">
          <p className="text-[9px] font-black uppercase tracking-[0.5em] text-foreground/50">
            Built with
          </p>
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-black tracking-tighter text-primary uppercase">AI Setu Bharat</span>
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-destructive/10">
                <Heart className="size-2.5 text-destructive fill-current animate-pulse" />
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.25em] text-center px-4 leading-relaxed">
            &copy; {currentYear} AI Setu Bharat &bull; All Rights Reserved
          </p>
          <div className="w-8 h-0.5 bg-primary/10 rounded-full" />
        </div>
      </div>
    </footer>
  );
}
