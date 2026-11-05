
"use client";

import { useAppContext } from "@/hooks/use-app-context";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetDescription
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, BellRing, Inbox, CheckCheck, Trash2, Clock, Megaphone, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function NotificationDrawer() {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } = useAppContext();
  const router = useRouter();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleOpenNotice = async (notif: any) => {
    if (!notif.isRead) {
      await markNotificationAsRead(notif.id);
    }
    router.push('/dashboard');
    // For MVP, jumping to dashboard is enough as notices are at the top.
    // In a full app, we'd scroll to specific notice.
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full transition-all active:scale-90 hover:bg-primary/5">
          {unreadCount > 0 ? (
            <BellRing className="size-5 text-primary animate-bounce" />
          ) : (
            <Bell className="size-5 text-muted-foreground" />
          )}
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-black text-white ring-2 ring-background">
              {unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-sm rounded-l-[2rem] border-none shadow-2xl p-0">
        <SheetHeader className="p-6 border-b border-primary/5">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <Megaphone className="size-4" />
              School Notifications
            </SheetTitle>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/5"
                onClick={markAllNotificationsAsRead}
              >
                <CheckCheck className="size-3 mr-1" />
                Read All
              </Button>
            )}
          </div>
          <SheetDescription className="hidden">Parent Inbox</SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 space-y-4 opacity-40">
              <div className="bg-primary/5 p-8 rounded-[2rem]">
                <Inbox className="size-16 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black uppercase tracking-widest">All caught up!</p>
                <p className="text-[10px] font-bold uppercase tracking-tighter">No new school notifications.</p>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {notifications.map((notif) => (
                <div 
                  key={notif.id}
                  className={cn(
                    "group relative p-5 rounded-[2rem] border transition-all duration-300 cursor-pointer overflow-hidden",
                    notif.isRead 
                      ? "bg-white/40 border-primary/5 opacity-70" 
                      : "bg-primary/5 border-primary shadow-lg shadow-primary/5 ring-1 ring-primary/20"
                  )}
                  onClick={() => handleOpenNotice(notif)}
                >
                  {!notif.isRead && (
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                  )}
                  
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant={notif.isRead ? "secondary" : "default"} className="text-[8px] font-black uppercase tracking-widest px-2 py-0 h-4">
                      {notif.type}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-muted-foreground flex items-center gap-1">
                        <Clock className="size-2.5" />
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 rounded-full text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif.id);
                        }}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>

                  <h4 className="text-sm font-black text-foreground mb-1 leading-tight">{notif.title}</h4>
                  <p className="text-[11px] font-medium text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                    {notif.messagePreview}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-primary/5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">
                      From: {notif.teacherName || "School Office"}
                    </span>
                    <ChevronRight className="size-4 text-primary" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
