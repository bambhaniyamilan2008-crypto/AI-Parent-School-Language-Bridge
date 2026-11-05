
"use client";

import { AnimatedWrapper } from "@/components/animated-wrapper";
import VoiceRecorder from "@/components/voice-recorder";
import { useAppContext } from "@/hooks/use-app-context";
import { t } from "@/lib/translations";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RecordPage() {
  const { userProfile, selectedTeacher } = useAppContext();
  const router = useRouter();
  
  const lang = userProfile?.language || "English";

  useEffect(() => {
    // Redirect all roles to selection if no recipient is picked
    if (!selectedTeacher) {
      router.push("/select-teacher");
    }
  }, [selectedTeacher, userProfile, router]);
  
  return (
    <AnimatedWrapper className="animate-slide-in flex-1 flex flex-col">
      <div className="container mx-auto flex-1 flex flex-col pt-4">
        {userProfile?.name && (
          <div className="mb-6 animate-fade-in">
            <h2 className="text-3xl font-black tracking-tight text-primary">
              {t('greeting', lang)} {userProfile.name} 👋
            </h2>
            <div className="flex items-center gap-2 mt-2">
                <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">
                {userProfile.role} • {lang}
                </p>
                {selectedTeacher && (
                    <>
                        <span className="text-muted-foreground/20">|</span>
                        <Badge variant="outline" className="text-[9px] uppercase font-bold py-0 h-4 border-primary/20 bg-primary/5 text-primary">
                            Messaging: {selectedTeacher.name}
                        </Badge>
                    </>
                )}
            </div>
          </div>
        )}
        <VoiceRecorder />
      </div>
    </AnimatedWrapper>
  );
}
