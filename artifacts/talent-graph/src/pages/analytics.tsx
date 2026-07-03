import { 
  useGetRevenueAnalytics, 
  useGetPipelineAnalytics, 
  useGetSourceAnalytics, 
  useGetReferralAnalytics, 
  useListActivity 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Cell, Legend 
} from "recharts";
import { AlertTriangle, Activity, Users, Target, TrendingUp, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Analytics() {
  const { data: revData, isLoading: revLoading } = useGetRevenueAnalytics();
  const { data: pipeData, isLoading: pipeLoading } = useGetPipelineAnalytics();
  const { data: srcData, isLoading: srcLoading } = useGetSourceAnalytics();
  const totalTarget = revData?.byMonth?.reduce((s, m) => s + (m.target ?? 0), 0) ?? 0;
  const { data: refData, isLoading: refLoading } = useGetReferralAnalytics();
  const { data: activityData, isLoading: actLoading } = useListActivity();

  const isLoading = revLoading || pipeLoading || srcLoading || refLoading || actLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <Skeleton className="h-10 w-[400px] rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] w-full rounded-xl" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics & Insights</h1>
      </div>
      
      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-grid bg-muted/50 p-1 rounded-lg border border-border/50">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
        </TabsList>

        {/* REVENUE TAB */}
        <TabsContent value="revenue" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-card/50 backdrop-blur border-border/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">₹{revData?.totalRevenue?.toFixed(2) || '0.00'} Cr</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur border-border/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Target Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">₹{totalTarget.toFixed(2)} Cr</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur border-border/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Achievement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-chart-2">
                  {totalTarget ? Math.round(((revData?.totalRevenue ?? 0) / totalTarget) * 100) : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>Revenue vs Target</CardTitle>
              <CardDescription>Monthly revenue realization against targets</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {revData?.byMonth && revData.byMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={revData.byMonth} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}Cr`} dx={-10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number, name: string) => {
                        return [`₹${value.toFixed(2)} Cr`, name.charAt(0).toUpperCase() + name.slice(1)];
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="revenue" name="Actual Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={60} />
                    <Line type="step" dataKey="target" name="Target" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No revenue data</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PIPELINE TAB */}
        <TabsContent value="pipeline" className="space-y-6 mt-6">
          {pipeData?.bottleneckStage && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-4">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-destructive">Pipeline Bottleneck Detected</h4>
                <p className="text-sm text-destructive/90 mt-1">
                  The highest drop-off rate is currently at the <span className="font-bold">{pipeData.bottleneckStage}</span> stage. Consider reviewing the evaluation criteria or response times for this phase.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2 border-border shadow-sm">
              <CardHeader>
                <CardTitle>Pipeline Funnel</CardTitle>
                <CardDescription>Candidate progression across all active roles</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {pipeData?.funnel && pipeData.funnel.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pipeData.funnel} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis dataKey="stage" type="category" stroke="hsl(var(--foreground))" fontWeight="500" fontSize={12} tickLine={false} axisLine={false} width={100} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                        formatter={(value: number, name: string) => {
                          if (name === 'count') return [value, 'Candidates'];
                          if (name === 'conversionRate') return [`${value}%`, 'Conversion Rate'];
                          return [value, name];
                        }}
                      />
                      <Bar dataKey="count" name="Candidates" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} barSize={32}>
                        {pipeData.funnel.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.stage === pipeData.bottleneckStage ? 'hsl(var(--destructive))' : 'hsl(var(--chart-2))'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">No pipeline data</div>
                )}
              </CardContent>
            </Card>

            <Card className="xl:col-span-1 border-border shadow-sm flex flex-col h-[400px] xl:h-auto">
              <CardHeader className="pb-3 border-b border-border/50 shrink-0">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="w-5 h-5 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-0">
                <div className="divide-y divide-border/50">
                  {activityData && activityData.length > 0 ? (
                    activityData.slice(0, 20).map((activity) => (
                      <div key={activity.id} className="p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-sm">{activity.entityType}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground/90">{activity.action}</p>
                        {activity.details && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{activity.details}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No recent activity.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SOURCES TAB */}
        <TabsContent value="sources" className="space-y-6 mt-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>Source Effectiveness</CardTitle>
              <CardDescription>Candidate origination and conversion to hire</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {srcData?.bySource && srcData.bySource.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={srcData.bySource} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="source" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} dx={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar yAxisId="left" dataKey="count" name="Sourced" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar yAxisId="left" dataKey="hires" name="Hired" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Line yAxisId="right" type="monotone" dataKey="conversionRate" name="Conversion %" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No source data</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* NETWORK TAB */}
        <TabsContent value="network" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-card/50 backdrop-blur border-border/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" /> Total Referrers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{refData?.totalReferrers || 0}</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur border-border/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Target className="h-4 w-4" /> Active Referrers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{refData?.activeReferrers || 0}</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur border-border/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Referral-to-Hire Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-chart-2">
                  {refData?.referralToHireRate?.toFixed(1) || '0.0'}%
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur border-border/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Filter className="h-4 w-4" /> Avg Scout Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {refData?.avgScoutScore?.toFixed(0) || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>Referral Funnel</CardTitle>
              <CardDescription>Progression of referred candidates</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {refData?.funnel && refData.funnel.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={refData.funnel} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="stage" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} dx={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar yAxisId="left" dataKey="count" name="Candidates" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} maxBarSize={60} />
                    <Line yAxisId="right" type="monotone" dataKey="conversionRate" name="Conversion %" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No referral data</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}