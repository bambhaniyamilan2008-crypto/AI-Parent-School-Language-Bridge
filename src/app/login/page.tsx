
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { initiateEmailSignIn } from "@/firebase/non-blocking-login";
import { useAuth } from "@/firebase";
import { useAppContext } from "@/hooks/use-app-context";
import { AnimatedWrapper } from "@/components/animated-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Footer } from "@/components/footer";
import { BackButton } from "@/components/back-button";
import { Mail, Lock, LogIn, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  const router = useRouter();
  const auth = useAuth();
  const { userProfile, isInitialLoading } = useAppContext();

  useEffect(() => {
    // If user is already logged in and has a profile, go to record
    if (userProfile) {
      router.push("/record");
    }
  }, [userProfile, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setErrorMessage("");
    setIsSubmitting(true);
    
    initiateEmailSignIn(auth, email, password, (err) => {
      setErrorMessage(err);
      setIsSubmitting(false);
    });
  };

  return (
    <AnimatedWrapper className="min-h-screen bg-record-gradient flex flex-col">
      <main className="container mx-auto flex flex-1 max-w-md flex-col px-6 py-8 space-y-8">
        <div className="absolute top-8 left-6">
          <BackButton onClick={() => router.push("/")} />
        </div>

        <div className="text-center space-y-2 pt-12">
          <h1 className="text-4xl font-black tracking-tight text-primary">SETU</h1>
          <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-[10px]">Welcome Back</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-primary/10 shadow-2xl p-8 space-y-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <LogIn className="size-5 text-primary" />
            <h2 className="text-xl font-black uppercase tracking-tight">Login Account</h2>
          </div>

          {errorMessage && (
            <Alert variant="destructive" className="rounded-2xl border-none bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-[10px] font-black uppercase tracking-widest">Login Failed</AlertTitle>
              <AlertDescription className="text-xs font-bold leading-relaxed">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">Email or Phone</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40" />
                <Input 
                  type="email"
                  placeholder="email@school.com" 
                  className="h-12 pl-10 rounded-xl font-semibold border-primary/10 bg-white/50 focus:bg-white"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">Password</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40" />
                <Input 
                  type="password"
                  placeholder="••••••••" 
                  className="h-12 pl-10 rounded-xl font-semibold border-primary/10 bg-white/50 focus:bg-white"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 transition-all active:scale-[0.98]"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Sign In"}
            </Button>
          </form>

          <div className="pt-4 text-center">
            <Button 
              variant="link" 
              className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
              onClick={() => router.push("/")}
            >
              Don't have an account? <span className="text-primary ml-1">Create one</span>
            </Button>
          </div>
        </div>
      </main>

      <div className="max-w-md mx-auto w-full">
        <Footer />
      </div>
    </AnimatedWrapper>
  );
}
