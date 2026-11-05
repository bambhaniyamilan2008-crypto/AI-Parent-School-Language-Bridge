
"use client";

import { AnimatedWrapper } from "@/components/animated-wrapper";
import { useAppContext } from "@/hooks/use-app-context";
import { TeacherDashboard } from "@/components/teacher-dashboard";
import { StudentDashboard } from "@/components/student-dashboard";
import { ParentDashboard } from "@/components/parent-dashboard";
import { AdminDashboard } from "@/components/admin-dashboard";
import { Loader2, ShieldAlert, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { userProfile, isInitialLoading } = useAppContext();

  if (isInitialLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AnimatedWrapper className="animate-slide-in flex-1 flex flex-col">
      <div className="container mx-auto h-full max-w-md p-4 flex-1 flex flex-col space-y-6">
        {userProfile?.role === "Child" && (
          <Card className="bg-primary/5 border-primary/10 rounded-[2rem] overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <ShieldAlert className="size-4" />
                Safe Help & Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-medium text-muted-foreground">Need to talk to a counselor privately?</p>
                <Button size="sm" variant="outline" className="rounded-full text-[10px] font-bold h-8 border-primary/20">
                  <Heart className="size-3 mr-1 text-destructive fill-current" />
                  Connect
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {userProfile?.role === "Teacher" && <TeacherDashboard />}
        {userProfile?.role === "Child" && <StudentDashboard />}
        {userProfile?.role === "Parent" && <ParentDashboard />}
        {userProfile?.role === "SchoolAdmin" && <AdminDashboard />}
      </div>
    </AnimatedWrapper>
  );
}
