
"use client";

import { useAppContext } from "@/hooks/use-app-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { User, Baby, School, MessageSquare, Send, Reply } from "lucide-react";
import type { Role, Sentiment, Conversation } from "@/lib/types";
import { useMemo } from "react";

const roleIcons: Record<Role, React.ReactNode> = {
  Child: <Baby className="size-5 text-primary-foreground" />,
  Parent: <User className="size-5 text-primary-foreground" />,
  Teacher: <School className="size-5 text-primary-foreground" />,
};

const sentimentVariant: Record<Sentiment, "destructive" | "neutral" | "default"> = {
    Negative: 'destructive',
    Neutral: 'neutral',
    Positive: 'default'
};

const DEMO_HISTORY: Partial<Conversation>[] = [
  {
    id: "demo-h-1",
    timestamp: Date.now() - 3600000,
    senderName: "Aryan Khan",
    receiverName: "Mrs. Sharma",
    role: "Child",
    transcription: "I don't get the homework, it's too hard.",
    rephrased: "I am having some difficulty understanding the homework assignment. Could you please provide some extra guidance?",
    sentiment: "Neutral",
  },
  {
    id: "demo-h-2",
    timestamp: Date.now() - 7200000,
    senderName: "Mrs. Sharma",
    receiverName: "Aryan Khan",
    role: "Teacher",
    transcription: "I can help you after class today.",
    rephrased: "I would be happy to help you with those concepts after class today. Let's meet at 3 PM.",
    sentiment: "Positive",
  }
];

export default function HistoryList() {
  const { history, userProfile } = useAppContext();

  const displayHistory = useMemo(() => {
    return history.length > 0 ? history : (DEMO_HISTORY as Conversation[]);
  }, [history]);

  return (
    <div className="space-y-8 pb-10">
      <header className="mb-2">
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground/60 flex items-center gap-2">
          <MessageSquare className="size-4" />
          Message History
        </h2>
      </header>

      <div className="space-y-6 relative">
        <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-primary/5 -z-10" />
        
        {displayHistory.map((conv) => (
          <Card key={conv.id} className="relative border-primary/5 shadow-sm rounded-3xl overflow-hidden bg-white/60 backdrop-blur-sm">
            <div className="absolute top-6 left-0 w-1 h-12 bg-primary rounded-r-full" />
            
            <CardHeader className="pb-3 pt-6 px-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
                    {roleIcons[conv.role] || <MessageSquare className="size-5 text-white" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                      {conv.role === 'Teacher' ? 'Received Response' : 'Sent Mediated'}
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {conv.role === 'Teacher' ? `From: ${conv.senderName}` : `To: ${conv.receiverName}`}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                   <Badge variant={sentimentVariant[conv.sentiment] || 'neutral'} className="text-[9px] font-black uppercase tracking-widest px-2 py-0">
                      {conv.sentiment}
                   </Badge>
                   <span className="text-[9px] font-bold text-muted-foreground mt-1 uppercase">
                      {conv.timestamp ? formatDistanceToNow(new Date(conv.timestamp), { addSuffix: true }) : "Recent"}
                   </span>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="px-6 pb-6 space-y-4">
              <div className="bg-primary/5 rounded-2xl p-4 border border-primary/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Mediated Message</p>
                <p className="text-sm font-bold text-foreground leading-relaxed italic">
                  "{conv.rephrased}"
                </p>
              </div>
              
              <div className="px-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-1">Original Intent</p>
                <p className="text-[11px] font-medium text-muted-foreground line-clamp-2">
                  {conv.transcription}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
