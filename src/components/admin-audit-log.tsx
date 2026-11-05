
"use client";

import { useState, useMemo } from "react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import type { NoticeAuditLog } from "@/lib/types";
import { format } from "date-fns";
import { 
  Search, 
  Filter, 
  History, 
  Loader2, 
  Inbox, 
  ChevronRight, 
  User, 
  Calendar,
  FileText,
  ShieldCheck
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { NoticeAuditTimeline } from "./notice-audit-timeline";

interface AdminAuditLogProps {
  schoolName: string;
}

export function AdminAuditLog({ schoolName }: AdminAuditLogProps) {
  const db = useFirestore();
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const auditQuery = useMemoFirebase(() => {
    return query(
      collection(db, "notice_audit_logs"),
      where("schoolName", "==", schoolName),
      orderBy("timestamp", "desc"),
      limit(100)
    );
  }, [db, schoolName]);

  const { data: allLogs, isLoading } = useCollection<NoticeAuditLog>(auditQuery);

  const filteredLogs = useMemo(() => {
    if (!allLogs) return [];
    return allLogs.filter(log => {
      const actionMatch = actionFilter === "all" || log.action === actionFilter;
      const searchMatch = !searchQuery || 
        log.noticeTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.actorName.toLowerCase().includes(searchQuery.toLowerCase());
      return actionMatch && searchMatch;
    });
  }, [allLogs, actionFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            Governance Audit Trail
          </h3>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase">Append-only record of school communications</p>
        </div>
        <Badge variant="outline" className="bg-primary/5 text-primary text-[10px] font-black uppercase border-primary/10 px-4 h-8 rounded-full">
          {filteredLogs.length} Records
        </Badge>
      </header>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40" />
          <Input 
            placeholder="Search by title or actor..." 
            className="h-11 pl-10 rounded-xl bg-white border-primary/10 shadow-sm focus:ring-primary/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-48 h-11 rounded-xl bg-white border-primary/10 text-[10px] font-black uppercase tracking-widest">
             <Filter className="size-3 mr-2 text-primary" />
             <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
             <SelectItem value="all">All Actions</SelectItem>
             <SelectItem value="created">Created</SelectItem>
             <SelectItem value="updated">Updated</SelectItem>
             <SelectItem value="submitted">Submitted</SelectItem>
             <SelectItem value="approved">Approved</SelectItem>
             <SelectItem value="ack_requirement_changed">Ack Policy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="rounded-[2.5rem] border-primary/10 bg-white/60 backdrop-blur-md overflow-hidden shadow-xl border-2">
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="p-12 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="size-10 animate-spin text-primary" />
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Fetching records...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] opacity-40 text-center space-y-4">
                 <Inbox className="size-16" />
                 <div className="space-y-1">
                   <p className="text-sm font-black uppercase tracking-widest">No audit records found</p>
                   <p className="text-[10px] font-bold uppercase">Adjust your filters or search query</p>
                 </div>
              </div>
            ) : (
              <div className="divide-y divide-primary/5">
                {filteredLogs.map((log) => (
                  <Dialog key={log.id}>
                    <DialogTrigger asChild>
                      <div className="p-6 hover:bg-primary/5 transition-all cursor-pointer group">
                        <div className="flex justify-between items-start mb-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className={cn(
                                "text-[8px] font-black uppercase px-2 py-0.5",
                                log.action === 'approved' ? "bg-green-500" : 
                                log.action === 'created' ? "bg-blue-500" : 
                                log.action === 'updated' ? "bg-amber-500" : "bg-indigo-500"
                              )}>
                                {log.action}
                              </Badge>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                {format(new Date(log.timestamp), "MMM d, h:mm a")}
                              </span>
                            </div>
                            <h4 className="text-base font-black text-foreground group-hover:text-primary transition-colors leading-tight">
                              {log.noticeTitle}
                            </h4>
                          </div>
                          <div className="text-right">
                             <div className="flex items-center justify-end gap-1.5 text-primary">
                               <User className="size-3" />
                               <span className="text-[10px] font-black uppercase">{log.actorName}</span>
                             </div>
                             <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">{log.actorRole}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-primary/5 pt-3 mt-3">
                           <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1"><FileText className="size-3" /> ID: {log.noticeId.slice(0,8)}...</span>
                              {log.metadata?.fieldsChanged && (
                                <span className="flex items-center gap-1 font-bold text-primary/60"><History className="size-3" /> {log.metadata.fieldsChanged.length} changes</span>
                              )}
                           </div>
                           <div className="flex items-center gap-1 text-primary/40 font-bold uppercase group-hover:text-primary transition-colors">
                             View Timeline <ChevronRight className="size-3" />
                           </div>
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="rounded-[2.5rem] p-10 max-w-lg border-none shadow-2xl">
                      <DialogHeader className="space-y-4 mb-6">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-2xl bg-primary/10">
                            <History className="size-6 text-primary" />
                          </div>
                          <div className="text-left">
                            <DialogTitle className="text-xl font-black uppercase tracking-tight leading-none">Full Notice History</DialogTitle>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Lifecycle audit for: {log.noticeTitle}</p>
                          </div>
                        </div>
                      </DialogHeader>
                      <NoticeAuditTimeline noticeId={log.noticeId} />
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
