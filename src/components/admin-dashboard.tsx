
"use client";

import { useState, useMemo } from "react";
import { useAppContext } from "@/hooks/use-app-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Megaphone, 
  MessageCircle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Inbox, 
  FileText,
  TrendingUp,
  UserCheck,
  ShieldCheck,
  Calendar,
  ChevronRight,
  ArrowUpRight,
  Filter,
  BarChart3,
  Users,
  History
} from "lucide-react";
import { format, subDays, isAfter, startOfDay } from "date-fns";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { cn } from "@/lib/utils";
import type { SchoolNotice, AppNotification } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminAnalytics } from "@/components/admin-analytics";
import { AdminAuditLog } from "@/components/admin-audit-log";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DateRange = "7d" | "30d" | "90d" | "all";

export function AdminDashboard() {
  const { userProfile, history } = useAppContext();
  const db = useFirestore();
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  // Fetch school-wide notices
  const schoolNoticesQuery = useMemoFirebase(() => {
    if (!userProfile?.schoolName) return null;
    return query(
      collection(db, "school_notices"),
      where("schoolName", "==", userProfile.schoolName),
      orderBy("createdAt", "desc")
    );
  }, [db, userProfile?.schoolName]);

  const { data: allNotices, isLoading: isLoadingNotices } = useCollection<SchoolNotice>(schoolNoticesQuery);

  // Fetch school-wide notifications for engagement
  const notificationsQuery = useMemoFirebase(() => {
    if (!userProfile?.schoolName) return null;
    return query(
        collection(db, "notifications"),
        where("schoolName", "==", userProfile.schoolName),
        orderBy("createdAt", "desc")
    );
  }, [db, userProfile?.schoolName]);
  
  const { data: allNotifications } = useCollection<AppNotification>(notificationsQuery);

  // Filtering Logic
  const filteredData = useMemo(() => {
    if (!allNotices) return { notices: [], notifications: [], conversations: [] };

    const now = new Date();
    const cutOff = dateRange === "7d" ? subDays(now, 7) : 
                   dateRange === "30d" ? subDays(now, 30) : 
                   dateRange === "90d" ? subDays(now, 90) : null;

    const filteredNotices = allNotices.filter(n => {
      const dateMatch = !cutOff || isAfter(new Date(n.createdAt), cutOff);
      const statusMatch = statusFilter === "all" || n.status === statusFilter;
      const searchMatch = n.title.toLowerCase().includes(searchQuery.toLowerCase());
      return dateMatch && statusMatch && searchMatch;
    });

    const filteredNotifications = allNotifications?.filter(n => 
      !cutOff || isAfter(new Date(n.createdAt), cutOff)
    ) || [];

    const filteredConversations = history.filter(c => 
      !cutOff || isAfter(new Date(c.timestamp), cutOff)
    );

    return {
      notices: filteredNotices,
      notifications: filteredNotifications,
      conversations: filteredConversations
    };
  }, [allNotices, allNotifications, history, dateRange, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const { notices, notifications, conversations } = filteredData;
    const sent = notifications.length;
    const viewed = notifications.filter(n => n.isRead).length;
    
    return {
      total: notices.length,
      approved: notices.filter(n => n.status === "approved").length,
      draft: notices.filter(n => n.status === "draft").length,
      pending: notices.filter(n => n.status === "pending_review").length,
      sent,
      viewed,
      rate: sent > 0 ? Math.round((viewed / sent) * 100) : 0,
      conversations: conversations.length
    };
  }, [filteredData]);

  return (
    <div className="flex flex-col flex-1 space-y-8 pb-12 animate-fade-in">
      <header className="text-center space-y-4 py-6 border-b border-primary/10">
        <div className="flex items-center justify-center gap-3">
          <div className="bg-primary/10 p-2.5 rounded-2xl shadow-inner">
             <ShieldCheck className="size-8 text-primary" />
          </div>
          <div className="text-left">
            <h2 className="text-3xl font-black tracking-tighter text-primary uppercase leading-none">Management Console</h2>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mt-1">
              {userProfile?.schoolName} • Authorized Admin
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
           <Badge variant="outline" className="h-8 rounded-full px-4 bg-white/50 border-primary/10 gap-2">
              <Calendar className="size-3.5 text-primary" />
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                 <SelectTrigger className="border-none bg-transparent h-auto p-0 text-[10px] font-black uppercase focus:ring-0">
                    <SelectValue />
                 </SelectTrigger>
                 <SelectContent className="rounded-xl">
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                 </SelectContent>
              </Select>
           </Badge>
        </div>
      </header>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid grid-cols-2 bg-primary/5 rounded-full mb-8 p-1">
          <TabsTrigger value="analytics" className="rounded-full text-[11px] font-black uppercase py-2">
             <BarChart3 className="size-3 mr-2" /> School Analytics
          </TabsTrigger>
          <TabsTrigger value="audit" className="rounded-full text-[11px] font-black uppercase py-2">
             <History className="size-3 mr-2" /> Governance Audit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-12">
          {/* Analytics Section */}
          <AdminAnalytics 
            notices={filteredData.notices} 
            notifications={filteredData.notifications} 
            conversations={filteredData.conversations}
          />

          {/* Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-[2.5rem] border-none bg-primary shadow-xl shadow-primary/20 text-white overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                 <Megaphone className="size-24 rotate-12" />
              </div>
              <CardContent className="p-7">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Notice Engagement</p>
                <h3 className="text-5xl font-black">{stats.rate}%</h3>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold bg-white/20 w-fit px-3 py-1 rounded-full">
                   <UserCheck className="size-3" />
                   <span>{stats.viewed} / {stats.sent} Active Views</span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-none bg-indigo-600 shadow-xl shadow-indigo-200 text-white overflow-hidden relative group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                 <MessageCircle className="size-24 -rotate-12" />
              </div>
              <CardContent className="p-7">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Mediated Chat</p>
                <h3 className="text-5xl font-black">{stats.conversations}</h3>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold bg-white/20 w-fit px-3 py-1 rounded-full">
                   <TrendingUp className="size-3" />
                   <span>Interaction Volume</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-3 gap-4">
             <Card className="rounded-3xl border-primary/5 bg-white shadow-sm p-5 text-center">
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Approved</p>
                <p className="text-2xl font-black text-green-600">{stats.approved}</p>
             </Card>
             <Card className="rounded-3xl border-primary/5 bg-white shadow-sm p-5 text-center">
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Pending</p>
                <p className="text-2xl font-black text-amber-500">{stats.pending}</p>
             </Card>
             <Card className="rounded-3xl border-primary/5 bg-white shadow-sm p-5 text-center">
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Drafts</p>
                <p className="text-2xl font-black text-muted-foreground">{stats.draft}</p>
             </Card>
          </div>

          {/* Activity Section */}
          <section className="space-y-4">
             <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                   <FileText className="size-4" />
                   Recent Notice Activity
                </h3>
                <Badge variant="secondary" className="bg-primary/5 text-primary text-[9px] uppercase font-black px-3">
                  {filteredData.notices.length} Records
                </Badge>
             </div>

             <div className="flex gap-2">
                <div className="relative flex-1">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                   <Input 
                    placeholder="Search notices..." 
                    className="h-10 pl-9 rounded-xl border-primary/10 bg-white focus:ring-primary/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                   />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32 h-10 rounded-xl bg-white border-primary/10 text-[10px] font-bold uppercase">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="draft">Drafts</SelectItem>
                        <SelectItem value="pending_review">Pending</SelectItem>
                    </SelectContent>
                </Select>
             </div>

             <Card className="rounded-[2.5rem] border-primary/10 bg-white/60 backdrop-blur-md overflow-hidden shadow-xl border-2">
                <CardContent className="p-0">
                   <ScrollArea className="h-[400px]">
                      {isLoadingNotices ? (
                        <div className="p-8 space-y-4">
                           {[1,2,3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)}
                        </div>
                      ) : filteredData.notices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center opacity-40 grayscale">
                           <Inbox className="size-12 mb-2" />
                           <p className="text-xs font-black uppercase tracking-widest">No matching notices found</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-primary/5">
                           {filteredData.notices.map((notice) => (
                             <div key={notice.id} className="p-6 hover:bg-primary/5 transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                   <div className="space-y-1.5">
                                      <div className="flex items-center gap-2">
                                         <Badge className={cn(
                                            "text-[8px] font-black uppercase px-2 py-0 h-4 shadow-sm",
                                            notice.status === "approved" ? "bg-green-500" : notice.status === "draft" ? "bg-muted text-muted-foreground" : "bg-amber-500"
                                         )}>
                                            {notice.status}
                                         </Badge>
                                         <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{notice.type}</span>
                                      </div>
                                      <h4 className="text-base font-black text-foreground group-hover:text-primary transition-colors leading-tight">
                                        {notice.title}
                                      </h4>
                                   </div>
                                   <div className="text-right">
                                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">
                                        {format(new Date(notice.createdAt), "MMM d, yyyy")}
                                      </p>
                                      <Badge variant="outline" className="text-[8px] font-medium text-primary/60 border-primary/10 mt-1 uppercase">
                                        Class: {notice.targetClass}
                                      </Badge>
                                   </div>
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-primary/5">
                                   <div className="flex items-center gap-5">
                                      <div className="flex items-center gap-1.5">
                                         <Users className="size-3 text-muted-foreground" />
                                         <span className="text-[10px] font-bold text-muted-foreground uppercase">{notice.recipients.split(' ')[0]}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                         <ArrowUpRight className="size-3 text-primary" />
                                         <span className="text-[10px] font-black text-primary uppercase">By: {notice.teacherName}</span>
                                      </div>
                                   </div>
                                   <ChevronRight className="size-4 text-muted-foreground/30 group-hover:translate-x-1 transition-all" />
                                </div>
                             </div>
                           ))}
                        </div>
                      )}
                   </ScrollArea>
                </CardContent>
             </Card>
          </section>
        </TabsContent>

        <TabsContent value="audit">
          <AdminAuditLog schoolName={userProfile?.schoolName || ""} />
        </TabsContent>
      </Tabs>

      {/* Safety Policy */}
      <Card className="rounded-3xl border-dashed border-2 border-primary/20 bg-primary/5 p-6">
         <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-2xl shrink-0 shadow-sm">
               <ShieldCheck className="size-5 text-primary" />
            </div>
            <div className="space-y-1">
               <h4 className="text-xs font-black uppercase text-primary tracking-widest">Administrator Data Access</h4>
               <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase tracking-tighter">
                  You are viewing school-wide analytical aggregates and notice governance trails. Direct access to private family conversations is restricted to maintain educator-parent confidentiality.
               </p>
            </div>
         </div>
      </Card>
    </div>
  );
}
