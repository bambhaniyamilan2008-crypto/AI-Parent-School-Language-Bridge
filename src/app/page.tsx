
"use client";

import { OnboardingFlow } from "@/components/onboarding-flow";
import { AnimatedWrapper } from "@/components/animated-wrapper";
import { Footer } from "@/components/footer";
import { useAppContext } from "@/hooks/use-app-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function WelcomePage() {
  const { isOnboardingComplete } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    // If user has finished onboarding, they are logged in with a profile
    if (isOnboardingComplete) {
      router.push("/record");
    }
  }, [isOnboardingComplete, router]);

  if (isOnboardingComplete) return null;

  return (
    <AnimatedWrapper className="min-h-screen bg-record-gradient flex flex-col">
      <main className="container mx-auto flex flex-1 max-w-md flex-col px-6">
        <OnboardingFlow />
      </main>
      <div className="max-w-md mx-auto w-full">
        <Footer />
      </div>
    </AnimatedWrapper>
  );
}
