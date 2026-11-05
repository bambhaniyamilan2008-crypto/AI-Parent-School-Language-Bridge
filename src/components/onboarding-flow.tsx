
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/hooks/use-app-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, ShieldCheck, UserCircle, Mail, Lock, CheckCircle2, MessageSquare, Languages, Mic, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role, UserProfile, TeacherProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { BackButton } from "@/components/back-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const languages = [
  "English", "Hindi", "Gujarati", "Marathi", "Tamil", "Telugu", "Bengali", "Punjabi", "Kannada", "Malayalam"
];

const classes = ["1-5", "6-8", "9-12"];

const subjects = [
  "Mathematics",
  "Science",
  "English",
  "Hindi",
  "Marathi",
  "Gujarati",
  "Social Studies",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Physical Education",
  "Art & Craft",
  "Music"
];

export const MOCK_TEACHERS: TeacherProfile[] = [
  { id: "demo-teacher-1", name: "Mrs. Sharma", subject: "Mathematics", schoolName: "Setu Academy", availableTime: "M-F 9:00 AM - 10:00 AM" },
  { id: "demo-teacher-2", name: "Mr. Verma", subject: "Science", schoolName: "Setu Academy", availableTime: "M-F 11:00 AM - 12:00 PM" },
  { id: "demo-teacher-3", name: "Ms. Anita", subject: "English", schoolName: "Setu Academy", availableTime: "M-F 2:00 PM - 3:00 PM" },
  { id: "demo-teacher-4", name: "Dr. Kapoor", subject: "Physics", schoolName: "Setu Academy", availableTime: "M-F 10:00 AM - 11:00 AM" }
];

export function OnboardingFlow() {
  const router = useRouter();
  const { toast } = useToast();
  const { completeOnboarding } = useAppContext();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile & { password?: string }>>({
    language: "English",
  });
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);
  const goToLogin = () => router.push('/login');

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const { password, ...profileData } = formData;
      await completeOnboarding(profileData as UserProfile, password);
      router.push("/record");
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "We couldn't create your account. Please check your details.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordsMatch = !!(formData.password && confirmPassword && formData.password === confirmPassword);
  
  const isDetailsValid = !!(
    formData.name && 
    formData.name.trim() !== "" &&
    formData.email && 
    formData.email.trim() !== "" &&
    formData.password && 
    formData.password.length >= 6 &&
    passwordsMatch && 
    formData.language
  );

  const isFinalStepValid = () => {
    if (formData.role === "Child") return !!(formData.gradeClass);
    if (formData.role === "Parent") return !!(formData.childName && formData.childName.trim() !== "");
    if (formData.role === "Teacher") return !!(formData.schoolName && formData.schoolName.trim() !== "" && formData.subject);
    if (formData.role === "SchoolAdmin") return !!(formData.schoolName && formData.schoolName.trim() !== "");
    return false;
  };

  return (
    <div className="w-full max-w-md mx-auto py-8 space-y-8 animate-fade-in relative">
      {step > 1 && (
        <div className="absolute top-0 left-0 pt-0">
          <BackButton onClick={handleBack} />
        </div>
      )}

      <div className="text-center space-y-2 pt-4">
        <h1 className="text-4xl font-black tracking-tight text-primary uppercase">AI Setu Bharat</h1>
        <p className="text-muted-foreground font-black uppercase tracking-[0.1em] text-[10px]">Har Bhasha, Har Parivar, Har Baccha – Ek Setu.</p>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-primary/10 shadow-2xl p-8 min-h-[520px] flex flex-col transition-all duration-500">
        {step === 1 && (
          <div className="space-y-8 flex-1 flex flex-col items-center justify-center animate-fade-in text-center">
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center rotate-3 hover:rotate-0 transition-transform duration-300">
                <ShieldCheck className="size-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-foreground tracking-tight">AI Parent-School Language Bridge</h2>
                <p className="text-xs text-muted-foreground leading-relaxed px-4">
                  An AI-powered platform that helps schools communicate with parents through simple language, regional translations and voice-enabled school notices.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 w-full max-w-[280px] mx-auto py-2">
              <div className="flex items-center gap-3 text-left bg-primary/5 p-3 rounded-2xl border border-primary/10">
                <div className="bg-primary/10 p-2 rounded-xl">
                  <MessageSquare className="size-4 text-primary" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/80">Simple School Messages</span>
              </div>
              <div className="flex items-center gap-3 text-left bg-primary/5 p-3 rounded-2xl border border-primary/10">
                <div className="bg-primary/10 p-2 rounded-xl">
                  <Languages className="size-4 text-primary" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/80">Multilingual Translation</span>
              </div>
              <div className="flex items-center gap-3 text-left bg-primary/5 p-3 rounded-2xl border border-primary/10">
                <div className="bg-primary/10 p-2 rounded-xl">
                  <Mic className="size-4 text-primary" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/80">Voice / Audio Communication</span>
              </div>
            </div>

            <div className="space-y-3 w-full pt-4">
              <Button className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all active:scale-[0.98]" onClick={handleNext}>
                Create Account
              </Button>
              <Button variant="ghost" className="w-full h-14 rounded-2xl font-bold text-muted-foreground" onClick={goToLogin}>
                Login
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 flex-1 flex flex-col animate-fade-in">
             <div className="flex items-center gap-3 mb-2">
                <UserCircle className="size-5 text-primary" />
                <h2 className="text-xl font-black uppercase tracking-tight">Create Account</h2>
             </div>
             <div className="flex-1 space-y-5 overflow-y-auto max-h-[420px] pr-2 pb-4 scrollbar-hide">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">Full Name</Label>
                  <Input 
                    placeholder="Pranjali Jade" 
                    className="h-12 rounded-xl font-semibold border-primary/10"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">Email or Phone</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40" />
                    <Input 
                      placeholder="email@school.com" 
                      className="h-12 pl-10 rounded-xl font-semibold border-primary/10"
                      value={formData.email || ""}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">Create Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40" />
                    <Input 
                      type="password"
                      placeholder="••••••••" 
                      className="h-12 pl-10 rounded-xl font-semibold border-primary/10"
                      value={formData.password || ""}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1 flex justify-between">
                    Confirm Password
                    {passwordsMatch && formData.password && (
                      <span className="text-neutral flex items-center gap-1 animate-fade-in font-black">
                        <CheckCircle2 className="size-3" /> Matches
                      </span>
                    )}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40" />
                    <Input 
                      type="password"
                      placeholder="••••••••" 
                      className={cn(
                        "h-12 pl-10 rounded-xl font-semibold border-primary/10",
                        confirmPassword && !passwordsMatch && "border-destructive/30"
                      )}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">Preferred Language</Label>
                  <Select value={formData.language} onValueChange={(val) => setFormData({...formData, language: val})}>
                    <SelectTrigger className="h-12 rounded-xl font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {languages.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
             </div>
             <div className="flex gap-3 mt-auto pt-4 border-t border-primary/5">
                <Button variant="ghost" className="h-12 rounded-xl font-bold" onClick={handleBack}>Back</Button>
                <Button className="flex-1 h-12 rounded-xl font-bold" disabled={!isDetailsValid} onClick={handleNext}>
                    Continue
                </Button>
             </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 flex-1 flex flex-col animate-fade-in">
             <div className="text-center space-y-2 mb-2">
                <h2 className="text-xl font-black uppercase tracking-tight">Select Your Role</h2>
                <p className="text-xs text-muted-foreground">How will you be using AI Setu Bharat?</p>
             </div>
             <div className="flex-1 space-y-3">
                <RadioGroup 
                    value={formData.role} 
                    onValueChange={(val) => setFormData({ ...formData, role: val as Role })}
                    className="grid grid-cols-1 gap-2"
                  >
                    {[
                      { id: 'Child', label: '👧 Child (Student)', desc: 'I am a student at school' },
                      { id: 'Parent', label: '👩 Parent', desc: 'I am a parent' },
                      { id: 'Teacher', label: '👨‍🏫 Teacher', desc: 'I am an educator' },
                      { id: 'SchoolAdmin', label: '🛡️ Admin / Head', desc: 'I manage school communication' }
                    ].map((role) => (
                      <div key={role.id}>
                        <RadioGroupItem value={role.id} id={role.id} className="peer sr-only" />
                        <Label
                          htmlFor={role.id}
                          className={cn(
                            "flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all",
                            formData.role === role.id 
                              ? "border-primary bg-primary/5 text-primary shadow-sm" 
                              : "border-primary/5 bg-white/40 text-muted-foreground hover:bg-white"
                          )}
                        >
                          <span className="font-black text-[13px]">{role.label}</span>
                          <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest">{role.desc}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
             </div>
             <div className="flex gap-3 mt-auto pt-6 border-t border-primary/5">
                <Button variant="ghost" className="h-12 rounded-xl font-bold" onClick={handleBack}>Back</Button>
                <Button className="flex-1 h-12 rounded-xl font-bold" disabled={!formData.role} onClick={handleNext}>
                    Next Step
                </Button>
             </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 flex-1 animate-fade-in">
             <h2 className="text-xl font-black uppercase tracking-tight">Final Details</h2>
             <div className="space-y-4">
                {formData.role === "Child" && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">Your Class</Label>
                    <Select value={formData.gradeClass} onValueChange={(v) => setFormData({...formData, gradeClass: v})}>
                      <SelectTrigger className="h-12 rounded-xl font-semibold"><SelectValue placeholder="Select Class" /></SelectTrigger>
                      <SelectContent className="rounded-2xl">{classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                {formData.role === "Parent" && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">Child's Name</Label>
                    <Input placeholder="Child Name" className="h-12 rounded-xl font-semibold" value={formData.childName || ""} onChange={(e) => setFormData({...formData, childName: e.target.value})} />
                  </div>
                )}
                {(formData.role === "Teacher" || formData.role === "SchoolAdmin") && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">School Name</Label>
                      <Input placeholder="School Name" className="h-12 rounded-xl font-semibold" value={formData.schoolName || ""} onChange={(e) => setFormData({...formData, schoolName: e.target.value})} />
                    </div>
                    {formData.role === "Teacher" && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">Main Subject</Label>
                        <Select value={formData.subject} onValueChange={(v) => setFormData({...formData, subject: v})}>
                          <SelectTrigger className="h-12 rounded-xl font-semibold"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                          <SelectContent className="rounded-2xl">{subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}
             </div>
             <div className="flex gap-3 mt-auto pt-6 border-t border-primary/5">
                <Button variant="ghost" className="h-12 rounded-xl" onClick={handleBack}>Back</Button>
                <Button className="flex-1 h-12 rounded-xl font-bold shadow-xl shadow-primary/20" disabled={isSubmitting || !isFinalStepValid()} onClick={handleComplete}>
                  {isSubmitting ? <Loader2 className="animate-spin" /> : "Complete Setup"}
                </Button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
