
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/hooks/use-app-context";
import { useFirestore } from "@/firebase";
import { collection, getDocs, doc, addDoc } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  School, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  Trash2, 
  AlertTriangle, 
  UserPlus,
  Baby,
  UserCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecipientProfile, Role } from "@/lib/types";
import { MOCK_TEACHERS } from "./onboarding-flow";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MOCK_STUDENTS: RecipientProfile[] = [
  { id: "mock-s-1", name: "Aryan Khan", role: "Child", subtext: "Class 7A", secondaryText: "Setu Academy" },
  { id: "mock-s-2", name: "Sana Sheikh", role: "Child", subtext: "Class 8B", secondaryText: "Setu Academy" },
  { id: "mock-s-3", name: "Rahul Gupta", role: "Child", subtext: "Class 6C", secondaryText: "Setu Academy" },
];

const MOCK_PARENTS: RecipientProfile[] = [
  { id: "mock-p-1", name: "Mrs. Patil", role: "Parent", subtext: "Parent of Rahul", secondaryText: "Setu Academy" },
  { id: "mock-p-2", name: "Mr. Iyer", role: "Parent", subtext: "Parent of Sana", secondaryText: "Setu Academy" },
];

export function TeacherSelection() {
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();
  const { setSelectedTeacher, selectedTeacher, userProfile } = useAppContext();
  
  const isTeacher = userProfile?.role === "Teacher";
  const [recipients, setRecipients] = useState<RecipientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);

  const [newRecipient, setNewRecipient] = useState<Partial<RecipientProfile>>({
    name: "",
    role: "Child",
    subtext: "",
    secondaryText: "Setu Academy"
  });

  const fetchRecipients = async () => {
    try {
      const targetCollection = isTeacher ? "users" : "teachers";
      const querySnapshot = await getDocs(collection(db, targetCollection));
      
      let dbProfiles = querySnapshot.docs.map(doc => {
        const data = doc.data();
        if (isTeacher) {
          // If current user is teacher, they are looking for students/parents
          if (data.role === 'Teacher') return null;
          return {
            id: doc.id,
            name: data.name,
            role: data.role,
            subtext: data.role === 'Child' ? `Class ${data.gradeClass || 'N/A'}` : `Parent of ${data.childName || 'N/A'}`,
            secondaryText: data.schoolName || "Setu Academy"
          } as RecipientProfile;
        } else {
          // If current user is student/parent, they are looking for teachers
          return {
            id: doc.id,
            name: data.name,
            role: 'Teacher',
            subtext: data.subject,
            secondaryText: data.schoolName,
          } as any;
        }
      }).filter(p => p !== null) as RecipientProfile[];

      let combined = [...dbProfiles];
      
      if (isTeacher) {
        // Add mock students and parents for teacher view
        [...MOCK_STUDENTS, ...MOCK_PARENTS].forEach(mock => {
          if (!combined.some(t => t.id === mock.id)) combined.push(mock);
        });
      } else {
        // Add mock teachers for student/parent view
        MOCK_TEACHERS.forEach(mock => {
           const transformed = {
             id: mock.id,
             name: mock.name,
             role: 'Teacher' as Role,
             subtext: mock.subject,
             secondaryText: mock.schoolName,
           };
           if (!combined.some(t => t.id === transformed.id)) combined.push(transformed);
        });
      }

      setRecipients(combined.filter(t => !deletedIds.includes(t.id)));
    } catch (error) {
      setRecipients((isTeacher ? [...MOCK_STUDENTS, ...MOCK_PARENTS] : MOCK_TEACHERS.map(t => ({ id: t.id, name: t.name, role: 'Teacher' as Role, subtext: t.subject, secondaryText: t.schoolName }))).filter(t => !deletedIds.includes(t.id)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipients();
  }, [db, deletedIds, isTeacher]);

  const handleDeleteRecipient = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletedIds(prev => [...prev, id]);
    if (selectedTeacher?.id === id) setSelectedTeacher(null);

    const docRef = doc(db, isTeacher ? "users" : "teachers", id);
    deleteDocumentNonBlocking(docRef);

    toast({
      title: "Removed",
      description: "Profile has been removed from your directory.",
      variant: "destructive",
    });
  };

  const handleAddRecipient = async () => {
    if (!newRecipient.name || !newRecipient.role) {
      toast({ title: "Incomplete Form", variant: "destructive" });
      return;
    }

    setIsAdding(true);
    try {
      const targetCol = isTeacher ? "users" : "teachers";
      await addDoc(collection(db, targetCol), {
        ...newRecipient,
        createdAt: new Date().toISOString()
      });
      
      toast({ title: "Success", description: `${newRecipient.name} added.` });
      setOpenAddDialog(false);
      fetchRecipients();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 pb-24">
      <div className="flex justify-between items-center mb-2 px-2">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60">
          Directory ({recipients.length})
        </h3>
        
        <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="rounded-full h-8 font-black text-[10px] uppercase tracking-widest gap-2 bg-primary/5 text-primary border-primary/20">
              <UserPlus className="size-3" />
              Add {isTeacher ? "Contact" : "Teacher"}
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2rem] p-8 max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-primary text-center">Add New Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">Name</Label>
                <Input value={newRecipient.name} onChange={(e) => setNewRecipient({...newRecipient, name: e.target.value})} className="rounded-xl font-semibold" />
              </div>
              {isTeacher && (
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">Type</Label>
                    <Select value={newRecipient.role} onValueChange={(val) => setNewRecipient({...newRecipient, role: val as Role})}>
                        <SelectTrigger className="rounded-xl font-semibold"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Child">Student</SelectItem>
                            <SelectItem value="Parent">Parent</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleAddRecipient} className="w-full h-12 rounded-xl font-black uppercase" disabled={isAdding}>
                {isAdding ? <Loader2 className="animate-spin" /> : "Save to Directory"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {recipients.map((p) => {
        const isSelected = selectedTeacher?.id === p.id;
        return (
          <Card key={p.id} onClick={() => !isSelected && setSelectedTeacher(p)} className={cn("group cursor-pointer transition-all border-none shadow-md overflow-hidden rounded-[2rem]", isSelected ? "ring-2 ring-primary bg-primary/5" : "bg-white/60 hover:bg-white")}>
            <CardContent className="p-0">
              <div className="flex">
                <div className={cn("flex h-20 w-20 shrink-0 items-center justify-center transition-colors", isSelected ? "bg-primary text-white" : "bg-primary/10 text-primary")}>
                  {p.role === 'Child' ? <Baby className="size-10" /> : p.role === 'Parent' ? <UserCircle className="size-10" /> : <School className="size-10" />}
                </div>
                <div className="flex-1 p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-foreground">{p.name}</h3>
                      <div className="flex items-center gap-2 text-primary font-bold text-sm">
                          <Badge variant="outline" className="text-[9px] uppercase">{p.role === 'Child' ? 'Student' : p.role}</Badge>
                          <span className="text-muted-foreground font-medium text-xs">{p.subtext}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                        {isSelected && <Badge variant="default" className="bg-primary h-6"><CheckCircle2 className="size-3 mr-1" /> Selected</Badge>}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()} className="text-destructive h-8 w-8 rounded-full"><Trash2 className="size-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-[2rem]">
                            <AlertDialogHeader className="items-center"><AlertTriangle className="size-10 text-destructive mb-2" /><AlertDialogTitle>Remove from directory?</AlertDialogTitle></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={(e) => handleDeleteRecipient(p.id, e as any)} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      
      {selectedTeacher && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 animate-slide-in">
          <Button className="w-full h-14 rounded-2xl shadow-2xl font-black uppercase tracking-widest" onClick={() => router.push("/record")}>
            Continue to message {selectedTeacher.name.split(' ')[0]}
            <ArrowRight className="ml-3 size-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
