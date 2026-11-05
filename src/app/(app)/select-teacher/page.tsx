
"use client";

import { AnimatedWrapper } from "@/components/animated-wrapper";
import { TeacherSelection } from "@/components/teacher-selection";
import { useAppContext } from "@/hooks/use-app-context";

export default function SelectTeacherPage() {
  const { userProfile } = useAppContext();
  const isTeacher = userProfile?.role === "Teacher";

  return (
    <AnimatedWrapper className="animate-slide-in">
      <div className="container mx-auto h-full max-w-md p-4">
        <header className="mb-8 pt-4">
            <h1 className="text-3xl font-black tracking-tight text-primary">
                {isTeacher ? "Select Student or Parent" : "Select Teacher"}
            </h1>
            <p className="text-muted-foreground mt-1">
                {isTeacher ? "Choose who you want to send a constructive message to." : "Who would you like to message?"}
            </p>
        </header>
        <TeacherSelection />
      </div>
    </AnimatedWrapper>
  );
}
