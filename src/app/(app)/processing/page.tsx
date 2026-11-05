import { AnimatedWrapper } from "@/components/animated-wrapper";
import ProcessingFlow from "@/components/processing-flow";

export default function ProcessingPage() {
  return (
    <AnimatedWrapper className="animate-slide-in">
      <div className="container mx-auto flex h-full max-w-md flex-col items-center justify-center p-4">
        <ProcessingFlow />
      </div>
    </AnimatedWrapper>
  );
}
