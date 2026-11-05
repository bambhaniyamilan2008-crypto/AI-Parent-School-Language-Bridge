
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings, ShieldCheck, Globe, User, LogOut, Type, Eye, Accessibility } from "lucide-react";
import { useAppContext } from "@/hooks/use-app-context";
import type { TextSize } from "@/lib/types";

const languages = [
  "English", "Hindi", "Gujarati", "Marathi", "Tamil", "Telugu", "Bengali", "Punjabi", "Kannada", "Malayalam"
];

export function SettingsDialog() {
  const { userProfile, logout, updateAccessibilityPrefs } = useAppContext();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full transition-all active:scale-90 hover:bg-primary/5" aria-label="Settings">
          <Settings className="size-5 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-[2.5rem] max-w-sm border-none shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-black uppercase tracking-widest text-primary text-center flex items-center justify-center gap-2">
            <Settings className="size-4" />
            App Settings
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-8 mt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm font-bold bg-primary/5 p-4 rounded-2xl">
              <User className="size-5 text-primary" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase opacity-60">Profile</span>
                <span>{userProfile?.name}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                <Globe className="size-3" /> Language
              </Label>
              <Select defaultValue={userProfile?.language || "English"}>
                <SelectTrigger className="h-12 rounded-xl font-bold border-primary/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {languages.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-6 pt-4 border-t border-primary/5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <Accessibility className="size-3" /> Accessibility & Reading
            </h3>

            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/5">
              <div className="space-y-0.5">
                <Label className="text-[11px] font-bold uppercase tracking-tight flex items-center gap-1.5">
                  <Eye className="size-3 text-primary" /> Easy Reading
                </Label>
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">Large text and simplified layout</p>
              </div>
              <Switch 
                checked={userProfile?.easyReadingMode || false} 
                onCheckedChange={(checked) => updateAccessibilityPrefs({ easyReadingMode: checked })} 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                <Type className="size-3" /> Text Size
              </Label>
              <Select 
                value={userProfile?.textSize || "medium"} 
                onValueChange={(val) => updateAccessibilityPrefs({ textSize: val as TextSize })}
              >
                <SelectTrigger className="h-12 rounded-xl font-bold border-primary/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="small">Small (Default)</SelectItem>
                  <SelectItem value="medium">Medium (Readable)</SelectItem>
                  <SelectItem value="large">Large (Clear)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-primary/5">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <ShieldCheck className="size-4 text-primary" />
              <span>Data Privacy Enabled</span>
            </div>
            <p className="text-[9px] text-muted-foreground/60 leading-relaxed uppercase tracking-widest">
              Setu uses AI mediation to ensure safe communication. Your data is encrypted and secure.
            </p>
          </div>

          <Button 
            variant="destructive" 
            className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-destructive/20"
            onClick={logout}
          >
            <LogOut className="size-4 mr-2" />
            Logout Account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
