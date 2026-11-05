"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/hooks/use-app-context";
import { mediateMessage } from "@/app/actions";
import { CheckCircle, Languages, ScanText, ShieldCheck, Waves, MessageSquareText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/lib/translations";
import { useAuth } from "@/firebase";

const pipelineSteps = [
  { name: "Converting speech to text…", icon: Waves },
  { name: "Translating message…", icon: Languages },
  { name: "Understanding tone…", icon: ScanText },
  { name: "Creating constructive message…", icon: MessageSquareText },
];

export default function ProcessingFlow() {
  const { currentConversation, updateConversation, userProfile } = useAppContext();
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const lang = userProfile?.language || "English";

  useEffect(() => {
    if (!currentConversation?.audioDataUri && !currentConversation?.textMessage) {
      router.replace("/record");
      return;
    }

    const processMessage = async () => {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) throw new Error("Authentication required.");

        const result = await mediateMessage(
          idToken,
          currentConversation.audioDataUri, 
          currentConversation.textMessage
        );
        
        updateConversation({
          ...result,
          timestamp: Date.now(),
        });

        setActiveStep(pipelineSteps.length);
        
        navigationTimeoutRef.current = setTimeout(() => {
            router.push("/result");
        }, 800);

      } catch (error) {
        toast({
          title: "Processing Error",
          description: error instanceof Error ? error.message : "Could not process.",
          variant: "destructive",
        });
        router.push("/record");
      }
    };
    
    const stepInterval = setInterval(() => {
        setActiveStep((prev) => (prev < pipelineSteps.length - 1 ? prev + 1 : prev));
      }, 900);

    processMessage();
    
    return () => {
        clearInterval(stepInterval);
        if (navigationTimeoutRef.current) clearTimeout(navigationTimeoutRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center py-10 w-full animate-fade-in">
      <div className="space-y-2 mb-10">
        <h2 className="text-3xl font-black tracking-tight text-primary">
            {t('analyzing', lang)}
        </h2>
        <p className="text-muted-foreground font-medium max-w-[280px] mx-auto">
            Setu AI is processing your input to ensure constructive communication.
        </p>
      </div>

      <div className="w-full space-y-3 px-2">
        {pipelineSteps.map((step, index) => (
          <div
            key={step.name}
            className={`flex items-center space-x-4 rounded-[2rem] p-4 transition-all duration-500 ${
              index <= activeStep ? "bg-primary/10 border-primary/5" : "bg-muted/30 border-transparent"
            } border`}
          >
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-500 ${
                index <= activeStep ? "bg-primary shadow-lg shadow-primary/20 scale-105" : "bg-muted-foreground/20"
              }`}
            >
              {index < activeStep ? (
                <CheckCircle className="size-6 text-primary-foreground" />
              ) : (
                <step.icon className={`size-6 ${index <= activeStep ? "text-primary-foreground" : "text-muted-foreground/40"}`} />
              )}
            </div>
            <div className="flex flex-col items-start">
                <span className={`font-black uppercase tracking-widest text-[10px] ${index <= activeStep ? "text-primary" : "text-muted-foreground/40"}`}>
                Step {index + 1}
                </span>
                <span className={`font-bold text-sm ${index <= activeStep ? "text-foreground" : "text-muted-foreground/40"}`}>
                {step.name}
                </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
