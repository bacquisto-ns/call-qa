'use client';

import { useState, useEffect, useCallback } from 'react';
import AuthWrapper from '@/components/AuthWrapper';
import { Toaster } from "@/components/ui/toaster";
import { db } from '@/lib/firebase/client';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { listAgents } from '@/lib/firebase/agents';
import type { Agent } from '@/lib/types';
import type { CallData } from '../page'; // Assuming CallData is in src/app/page.tsx
import type { EvaluateCallQualityOutput } from '@/ai/flows/evaluate-call-quality'; // For typing evaluation field
import type { DateRange } from 'react-day-picker';
import { 
  subDays, 
  format, 
  startOfDay, 
  startOfWeek, 
  startOfMonth, 
  eachDayOfInterval, 
  eachWeekOfInterval, 
  eachMonthOfInterval,
  isWithinInterval, // Though not used in the bucket approach, good to have if needed elsewhere
} from 'date-fns';
import { DateRangePicker } from '@/components/DateRangePicker';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, Line, ResponsiveContainer } from 'recharts';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'; // Added

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allCalls, setAllCalls] = useState<CallData[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29), // Default to last 30 days (29 days ago to today)
    to: new Date(),
  });

  // States for processed data
  const [summaryStats, setSummaryStats] = useState<{ totalCalls: number; overallAverageScore: number; } | null>(null);
  const [trendData, setTrendData] = useState<{ date: string; callVolume: number; averageScore: number; }[] | null>(null);
  const [agentPerformanceData, setAgentPerformanceData] = useState<{ agentId: string; agentName: string; totalCalls: number; averageScore: number; }[] | null>(null);
  const [trendInterval, setTrendInterval] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedAgents = await listAgents();
      setAgents(fetchedAgents);

      let callsQuery = query(collection(db, 'calls'), where('status', '==', 'completed'));
      
      if (dateRange?.from && dateRange?.to) {
        // Ensure 'to' date includes the whole day by setting time to end of day
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);

        callsQuery = query(
          callsQuery,
          where('createdAt', '>=', Timestamp.fromDate(dateRange.from)),
          where('createdAt', '<=', Timestamp.fromDate(toDate))
        );
      }
      // Optionally, add orderBy('createdAt', 'desc')
      // callsQuery = query(callsQuery, orderBy('createdAt', 'desc'));

      const querySnapshot = await getDocs(callsQuery);
      const fetchedCalls = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Basic check for timestamp and conversion
        let createdAtDate;
        if (data.createdAt && typeof (data.createdAt as Timestamp).toDate === 'function') {
          createdAtDate = (data.createdAt as Timestamp).toDate();
        } else if (data.createdAt) {
          // Attempt to parse if it's a string or number, though Firestore typically uses Timestamps
          createdAtDate = new Date(data.createdAt);
        } else {
          createdAtDate = new Date(); // Fallback, though ideally createdAt should always exist
        }

        return {
          id: doc.id,
          ...data,
          createdAt: createdAtDate,
          // Ensure evaluation and agentId are correctly typed if accessed directly
          // The 'as CallData' cast below will handle this, but ensure CallData interface is accurate
          evaluation: data.evaluation as EvaluateCallQualityOutput, // Type assertion
        } as CallData; // Cast to CallData, ensure all fields match
      });
      setAllCalls(fetchedCalls);

    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setError(err.message || "Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  }, [dateRange]); // Dependency: dateRange

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (allCalls.length > 0 && agents.length > 0 && dateRange?.from && dateRange?.to) {
      // 1. Calculate Summary Statistics
      const totalCalls = allCalls.length;
      const sumOfOverallRatings = allCalls.reduce((acc, call) => acc + (call.evaluation?.overallRating || 0), 0);
      const overallAverageScore = totalCalls > 0 ? parseFloat((sumOfOverallRatings / totalCalls).toFixed(2)) : 0;
      setSummaryStats({ totalCalls, overallAverageScore });

      // 2. Calculate Trend Data (Refined Approach)
      const trendBuckets = new Map<string, { callVolume: number; totalScore: number }>();

      allCalls.forEach(call => {
        if (!call.createdAt) return; // Skip if no createdAt
        const callDate = new Date(call.createdAt); // Ensure it's a Date object

        let dateKey: string;
        if (trendInterval === 'daily') {
          dateKey = format(callDate, 'yyyy-MM-dd');
        } else if (trendInterval === 'weekly') {
          dateKey = format(startOfWeek(callDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        } else { // monthly
          dateKey = format(startOfMonth(callDate), 'yyyy-MM');
        }

        const bucket = trendBuckets.get(dateKey) || { callVolume: 0, totalScore: 0 };
        bucket.callVolume++;
        bucket.totalScore += call.evaluation?.overallRating || 0;
        trendBuckets.set(dateKey, bucket);
      });
      
      const calculatedTrendData = Array.from(trendBuckets.entries()).map(([date, data]) => ({
        date: trendInterval === 'weekly' ? `${date} (Week)` : date,
        callVolume: data.callVolume,
        averageScore: data.callVolume > 0 ? parseFloat((data.totalScore / data.callVolume).toFixed(2)) : 0,
      })).sort((a, b) => {
        const dateA = new Date(a.date.split(' ')[0]); // Handle ' (Week)' suffix for sorting
        const dateB = new Date(b.date.split(' ')[0]);
        return dateA.getTime() - dateB.getTime();
      });
      setTrendData(calculatedTrendData);
      
      // 3. Calculate Agent Performance Data
      const performanceData = agents.map(agent => {
        const agentCalls = allCalls.filter(call => call.agentId === agent.id);
        const totalAgentCalls = agentCalls.length;
        const sumAgentScores = agentCalls.reduce((acc, call) => acc + (call.evaluation?.overallRating || 0), 0);
        const averageAgentScore = totalAgentCalls > 0 ? parseFloat((sumAgentScores / totalAgentCalls).toFixed(2)) : 0;
        return {
          agentId: agent.id,
          agentName: agent.name,
          totalCalls: totalAgentCalls,
          averageScore: averageAgentScore,
        };
      }).sort((a,b) => b.averageScore - a.averageScore); // Sort by average score descending
      setAgentPerformanceData(performanceData);

    } else {
      setSummaryStats(null);
      setTrendData(null);
      setAgentPerformanceData(null);
    }
  }, [allCalls, agents, dateRange, trendInterval]); // Dependencies

  const formatXAxisTick = (value: string) => {
    // value could be "YYYY-MM-DD", "YYYY-MM-DD (Week)", or "YYYY-MM"
    if (trendInterval === 'monthly') {
      return format(new Date(value), 'MMM yy'); // e.g., Jan 24
    }
    if (trendInterval === 'weekly') {
      const datePart = value.split(' ')[0]; // "YYYY-MM-DD"
      return format(new Date(datePart), 'MMM dd'); // e.g., Jan 15
    }
    // Daily
    return format(new Date(value), 'MMM dd'); // e.g., Jan 15
  };

  return (
    <AuthWrapper>
      <div className="container mx-auto p-4 md:p-8 space-y-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-primary">
            Call Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Insights into your call center performance.
          </p>
        </header>

        {loading && <p className="text-center p-8">Loading dashboard...</p>}
        {error && <p className="text-center p-8 text-red-500">Error: {error}</p>}

        {!loading && !error && (
          <>
            {/* Filters section */}
            <section id="dashboard-filters" className="mb-6 p-4 border rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-3">Filters</h2>
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <DateRangePicker date={dateRange} setDate={setDateRange} className="w-full md:w-auto" />
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Trend Interval:</label>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={trendInterval}
                    onValueChange={(value) => {
                      if (value) setTrendInterval(value as 'daily' | 'weekly' | 'monthly');
                    }}
                    aria-label="Trend interval"
                  >
                    <ToggleGroupItem value="daily" aria-label="Daily" size="sm">
                      Daily
                    </ToggleGroupItem>
                    <ToggleGroupItem value="weekly" aria-label="Weekly" size="sm">
                      Weekly
                    </ToggleGroupItem>
                    <ToggleGroupItem value="monthly" aria-label="Monthly" size="sm">
                      Monthly
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>
              
              {/* Temporary Debug Output - can be removed later */}
              <div className="mt-4 p-2 bg-slate-50 rounded text-xs text-slate-600">
                <p className="font-medium">Debug Info:</p>
                <p>Fetched Agents: {agents.length} | Fetched Calls: {allCalls.length}</p>
                <p>Summary: Total Calls: {summaryStats?.totalCalls}, Avg Score: {summaryStats?.overallAverageScore}</p>
                <p>Trend Data Points: {trendData?.length} (Interval: {trendInterval})</p>
                <p>Agent Perf. Data Points: {agentPerformanceData?.length}</p>
              </div>
            </section>

            {/* Summary Statistics section */}
            <section id="summary-stats" className="mb-6">
              {summaryStats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Total Calls</CardTitle>
                      <CardDescription>Calls analyzed within the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{summaryStats.totalCalls}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Avg. Call Score</CardTitle>
                      <CardDescription>Overall rating (1-5)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{summaryStats.overallAverageScore.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="animate-pulse">
                        <CardHeader><CardTitle>Total Calls</CardTitle><CardDescription>Loading...</CardDescription></CardHeader>
                        <CardContent><p className="text-3xl font-bold h-9 w-1/2 bg-muted rounded"></p></CardContent>
                    </Card>
                    <Card className="animate-pulse">
                        <CardHeader><CardTitle>Avg. Call Score</CardTitle><CardDescription>Loading...</CardDescription></CardHeader>
                        <CardContent><p className="text-3xl font-bold h-9 w-1/2 bg-muted rounded"></p></CardContent>
                    </Card>
                 </div>
              )}
            </section>

            {/* Trend Charts section */}
            <section id="trend-charts" className="mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Call Volume Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Call Volume Trend</CardTitle>
                    <CardDescription>Number of calls ({trendInterval})</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {trendData && trendData.length > 0 ? (
                      <ChartContainer className="h-[300px] w-full">
                        <BarChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={formatXAxisTick} 
                            angle={-30} 
                            textAnchor="end" 
                            interval={trendData.length > 10 ? Math.floor(trendData.length / 10) : 0} 
                            height={50}
                          />
                          <YAxis allowDecimals={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Bar dataKey="callVolume" fill="#8884d8" name="Calls" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center">
                        <p className="text-center text-muted-foreground">
                          No call volume data available for this period.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Average Score Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Average Score Trend</CardTitle>
                    <CardDescription>Average overall rating (1-5) ({trendInterval})</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {trendData && trendData.length > 0 ? (
                      <ChartContainer className="h-[300px] w-full">
                        <LineChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" />
                           <XAxis 
                            dataKey="date" 
                            tickFormatter={formatXAxisTick} 
                            angle={-30} 
                            textAnchor="end" 
                            interval={trendData.length > 10 ? Math.floor(trendData.length / 10) : 0} 
                            height={50}
                          />
                          <YAxis type="number" domain={[1, 5]} tickFormatter={(value) => value.toFixed(1)} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Line type="monotone" dataKey="averageScore" stroke="#82ca9d" name="Avg. Score" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ChartContainer>
                    ) : (
                       <div className="h-[300px] flex items-center justify-center">
                        <p className="text-center text-muted-foreground">
                          No average score data available for this period.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Agent Performance section */}
            <section id="agent-performance" className="mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Agent Performance</CardTitle>
                  <CardDescription>
                    Breakdown of call metrics by agent for the selected period.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {agentPerformanceData && agentPerformanceData.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Agent Name</TableHead>
                          <TableHead className="text-right">Total Calls</TableHead>
                          <TableHead className="text-right">Average Score (1-5)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agentPerformanceData.map((agent) => (
                          <TableRow key={agent.agentId}>
                            <TableCell className="font-medium">{agent.agentName}</TableCell>
                            <TableCell className="text-right">{agent.totalCalls}</TableCell>
                            <TableCell className="text-right">{agent.averageScore.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No agent performance data available for this period.
                    </p>
                  )}
                </CardContent>
              </Card>
            </section>
          </>
        )}
        <Toaster />
      </div>
    </AuthWrapper>
  );
}
