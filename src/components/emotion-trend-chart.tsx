"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAppContext } from "@/hooks/use-app-context";
import type { Conversation } from "@/lib/types";
import { MessageSquare } from "lucide-react";

type ChartData = {
  day: string;
  Positive: number;
  Neutral: number;
  Negative: number;
};

const chartConfig = {
  Positive: {
    label: "Positive",
    color: "hsl(var(--chart-2))",
  },
  Neutral: {
    label: "Neutral",
    color: "hsl(var(--chart-1))",
  },
  Negative: {
    label: "Negative",
    color: "hsl(var(--destructive))",
  },
};

export default function EmotionTrendChart() {
  const { history } = useAppContext();

  const chartData = useMemo(() => {
    const data: ChartData[] = [
      { day: "Sun", Positive: 0, Neutral: 0, Negative: 0 },
      { day: "Mon", Positive: 0, Neutral: 0, Negative: 0 },
      { day: "Tue", Positive: 0, Neutral: 0, Negative: 0 },
      { day: "Wed", Positive: 0, Neutral: 0, Negative: 0 },
      { day: "Thu", Positive: 0, Neutral: 0, Negative: 0 },
      { day: "Fri", Positive: 0, Neutral: 0, Negative: 0 },
      { day: "Sat", Positive: 0, Neutral: 0, Negative: 0 },
    ];

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const relevantHistory = history.filter(
      (conv) => new Date(conv.timestamp) >= oneWeekAgo
    );

    relevantHistory.forEach((conv: Conversation) => {
      const dayIndex = new Date(conv.timestamp).getDay();
      if (conv.sentiment) {
        data[dayIndex][conv.sentiment]++;
      }
    });

    return data;
  }, [history]);

  const hasData = useMemo(() => chartData.some(d => d.Positive > 0 || d.Neutral > 0 || d.Negative > 0), [chartData]);


  if (!hasData) {
    return (
        <div className="flex flex-col items-center justify-center text-center h-64 rounded-lg border-dashed border-2">
            <MessageSquare className="size-16 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold">Not Enough Data</h3>
            <p className="text-muted-foreground">Sentiment trends will appear here once there is more activity.</p>
        </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Sentiment</CardTitle>
        <CardDescription>Breakdown for the last 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis
              allowDecimals={false}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="Positive" stackId="a" fill="var(--color-Positive)" radius={[0, 0, 4, 4]} />
            <Bar dataKey="Neutral" stackId="a" fill="var(--color-Neutral)" />
            <Bar dataKey="Negative" stackId="a" fill="var(--color-Negative)" radius={[4, 4, 0, 0]}/>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
