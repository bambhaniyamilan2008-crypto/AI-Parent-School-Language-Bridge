
"use client";

import { useMemo } from "react";
import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie,
  Tooltip,
  Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart";
import { format, startOfDay, eachDayOfInterval, subDays } from "date-fns";
import type { SchoolNotice, AppNotification, Conversation } from "@/lib/types";
import { BarChart3, PieChart as PieIcon, Globe, TrendingUp } from "lucide-react";

interface AdminAnalyticsProps {
  notices: SchoolNotice[];
  notifications: AppNotification[];
  conversations: Conversation[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--destructive))",
];

export function AdminAnalytics({ notices, notifications, conversations }: AdminAnalyticsProps) {
  
  // 1. Notice Creation Volume Over Time
  const volumeData = useMemo(() => {
    if (notices.length === 0) return [];
    
    // Group by day for the last 30 days or based on data range
    const days = 30;
    const interval = eachDayOfInterval({
      start: subDays(new Date(), days - 1),
      end: new Date()
    });

    return interval.map(date => {
      const dayStr = format(date, "MMM d");
      const count = notices.filter(n => 
        format(new Date(n.createdAt), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
      ).length;
      return { day: dayStr, notices: count };
    });
  }, [notices]);

  // 2. Engagement Distribution (Viewed vs Not Viewed)
  const engagementData = useMemo(() => {
    const viewed = notifications.filter(n => n.isRead).length;
    const unread = notifications.length - viewed;
    
    if (notifications.length === 0) return [];

    return [
      { name: "Viewed", value: viewed, color: "hsl(var(--chart-2))" },
      { name: "Not Viewed", value: unread, color: "hsl(var(--muted))" },
    ];
  }, [notifications]);

  // 3. Language Distribution
  const languageData = useMemo(() => {
    const langCounts: Record<string, number> = {};
    
    notices.forEach(notice => {
      Object.keys(notice.translations || {}).forEach(lang => {
        langCounts[lang] = (langCounts[lang] || 0) + 1;
      });
      // Always count English (Original/Simplified)
      langCounts["English"] = (langCounts["English"] || 0) + 1;
    });

    return Object.entries(langCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [notices]);

  const hasData = notices.length > 0 || notifications.length > 0;

  if (!hasData) {
    return (
      <Card className="border-dashed border-2 border-primary/10 bg-primary/5 rounded-[2.5rem]">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-4">
           <BarChart3 className="size-12 text-primary opacity-20" />
           <div className="space-y-1">
             <h3 className="text-xl font-black uppercase tracking-tight">No Analytic Data</h3>
             <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
               Communication metrics will appear here once notices are published.
             </p>
           </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Notice Activity Chart */}
      <Card className="rounded-[2.5rem] border-primary/10 shadow-lg bg-white overflow-hidden border-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <TrendingUp className="size-4" />
            Communication Activity
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase">Volume of notices over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <ChartContainer config={{ notices: { label: "Notices", color: "hsl(var(--primary))" } }} className="h-[200px] w-full">
            <BarChart data={volumeData}>
               <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1} />
               <XAxis 
                dataKey="day" 
                tickLine={false} 
                axisLine={false} 
                tick={{ fontSize: 9, fontWeight: 700 }} 
                tickMargin={10}
               />
               <YAxis 
                hide 
               />
               <ChartTooltip content={<ChartTooltipContent />} />
               <Bar 
                dataKey="notices" 
                fill="var(--color-notices)" 
                radius={[4, 4, 0, 0]} 
                barSize={12}
               />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Engagement Distribution */}
      <Card className="rounded-[2.5rem] border-primary/10 shadow-lg bg-white overflow-hidden border-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <PieIcon className="size-4" />
            Engagement Breakdown
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase">Parent view vs unread distribution</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center pt-2">
          <div className="h-[200px] w-full max-w-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={engagementData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {engagementData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border border-primary/10 rounded-2xl shadow-xl">
                          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">{payload[0].name}</p>
                          <p className="text-lg font-black">{payload[0].value} Families</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-6 mt-2">
             {engagementData.map((item) => (
               <div key={item.name} className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.name}</span>
               </div>
             ))}
          </div>
        </CardContent>
      </Card>

      {/* Language Insights */}
      <Card className="rounded-[2.5rem] border-primary/10 shadow-lg bg-white overflow-hidden md:col-span-2 border-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <Globe className="size-4" />
            Language Reach Trends
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase">Most utilized regional languages for translations</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
           <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              {languageData.length === 0 ? (
                <p className="col-span-full text-center text-[10px] font-bold text-muted-foreground uppercase py-10">No translation data recorded</p>
              ) : languageData.map((item, index) => (
                <div key={item.name} className="bg-primary/5 p-5 rounded-3xl border border-primary/5 relative overflow-hidden group hover:bg-primary/10 transition-colors">
                   <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Globe className="size-16" />
                   </div>
                   <p className="text-[9px] font-black uppercase text-primary/60 mb-1">Language</p>
                   <h4 className="text-xl font-black text-foreground">{item.name}</h4>
                   <div className="mt-3 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.value} Notices</span>
                      <div className="size-2 rounded-full bg-primary" />
                   </div>
                </div>
              ))}
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
