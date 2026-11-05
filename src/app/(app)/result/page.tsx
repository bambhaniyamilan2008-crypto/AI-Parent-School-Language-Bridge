import { AnimatedWrapper } from "@/components/animated-wrapper";
import ResultDisplay from "@/components/result-display";
import { Suspense } from "react";

export default function ResultPage() {
  return (
    <AnimatedWrapper className="animate-slide-in">
      <div className="container mx-auto h-full max-w-md p-4">
        <Suspense fallback={<div>Loading result...</div>}>
            <ResultDisplay />
        </Suspense>
      </div>
    </AnimatedWrapper>
  );
}