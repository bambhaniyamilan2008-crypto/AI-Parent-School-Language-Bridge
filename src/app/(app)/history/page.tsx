import { AnimatedWrapper } from "@/components/animated-wrapper";
import HistoryList from "@/components/history-list";

export default function HistoryPage() {
  return (
    <AnimatedWrapper className="animate-slide-in">
      <div className="container mx-auto h-full max-w-md p-4">
        <HistoryList />
      </div>
    </AnimatedWrapper>
  );
}
