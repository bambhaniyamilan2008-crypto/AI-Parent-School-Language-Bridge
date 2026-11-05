
"use client";

import { useMemo } from "react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import type { NoticeAuditLog } from "@/lib/types";
import { format, formatDistanceToNow } from "date-fns";
import { Loader2, History, User, CheckCircle2, Edit3, PlusCircle, AlertCircle, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NoticeAuditTimelineProps {
  noticeId: string;
}

const actionConfig: Record<string, { icon: any, color: string, label: string }> = {
  created: { icon: PlusCircle, color: "text-blue-500 bg-blue-50", label: "Notice Created" },
  updated: { icon: Edit3, color: "text-amber-500 bg-amber-50", label: "Notice Updated" },
  submitted: { icon: AlertCircle, color: "text-indigo-500 bg-indigo-50", label: "Submitted for Review" },
  approved: { icon: CheckCircle2, color: "text-green-500 bg-green-50", label: "Notice Approved" },
  ack_requirement_changed: { icon: FileText, color: "text-purple-500 bg-purple-50", label: "Acknowledge Required Changed" },
};

export function NoticeAuditTimeline({ noticeId }: NoticeAuditTimelineProps) {
  const db = useFirestore();

  const auditQuery = useMemoFirebase(() => {
    return query(
      collection(db, "notice_audit_logs"),
      where("noticeId", "==", noticeId),
      orderBy("timestamp", "desc")
    );
  }, [db, noticeId]);

  const { data: logs, isLoading } = useCollection<NoticeAuditLog>(auditQuery);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Loading activity history...</p>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center opacity-40">
        <History className="size-12 mb-2" />
        <p className="text-sm font-black uppercase tracking-widest">No activity history recorded</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="relative space-y-8 pl-4 py-4">
        {/* Vertical Line */}
        <div className="absolute left-[21px] top-0 bottom-0 w-0.5 bg-primary/5 -z-10" />

        {logs.map((log) => {
          const config = actionConfig[log.action] || { icon: History, color: "text-muted-foreground bg-muted", label: log.action };
          return (
            <div key={log.id} className="relative flex items-start gap-4 group">
              <div className={cn("shrink-0 size-11 rounded-2xl flex items-center justify-center shadow-sm z-10 transition-transform group-hover:scale-110", config.color)}>
                <config.icon className="size-5" />
              </div>
              
              <div className="flex-1 space-y-1.5 pt-0.5">
                <div className="flex justify-between items-start">
                   <h4 className="text-sm font-black text-foreground uppercase tracking-tight">{config.label}</h4>
                   <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter bg-muted/30 px-2 py-0.5 rounded-full">
                     {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                   </span>
                </div>
                
                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                   <User className="size-3" />
                   <span className="uppercase tracking-widest">{log.actorName}</span>
                   <Badge variant="outline" className="text-[8px] py-0 h-4 border-primary/10">{log.actorRole}</Badge>
                </div>

                {log.metadata?.fieldsChanged && log.metadata.fieldsChanged.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {log.metadata.fieldsChanged.map(field => (
                      <Badge key={field} variant="secondary" className="text-[8px] font-medium bg-primary/5 text-primary/60 border-none px-2">
                        MODIFIED: {field}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <p className="text-[9px] font-medium text-muted-foreground/60 italic pt-1">
                  {format(new Date(log.timestamp), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
