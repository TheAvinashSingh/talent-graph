import { useGetMyScoutScore } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, TrendingUp } from "lucide-react";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-muted/30 p-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function ReferrerScore() {
  const { data, isLoading } = useGetMyScoutScore();

  if (isLoading) return <Skeleton className="h-[500px] w-full rounded-xl" />;
  if (!data) return <p className="text-muted-foreground">No data available.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Scout Profile</h1>
        {data.isTalentScout && (
          <Badge className="gap-1">
            <Award className="h-3.5 w-3.5" /> TalentScout
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-cyan-400" /> Scout Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-5xl font-bold">{data.scoutScore.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {data.rank ? `Ranked #${data.rank}` : "Unranked"}
            </p>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Profile completeness</span>
                <span>{data.profileCompleteness}%</span>
              </div>
              <Progress value={data.profileCompleteness} />
              {data.profileCompleteness <= 80 && (
                <p className="text-xs text-amber-500 mt-2">
                  Reach 80%+ to unlock referrals.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Stat label="Submitted" value={data.submitted} />
              <Stat label="Shortlisted" value={data.shortlisted} />
              <Stat label="Interviewed" value={data.interviewed} />
              <Stat label="Hired" value={data.hired} />
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Success rate: {data.successRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent referrals</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentReferrals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No referrals yet.</p>
          ) : (
            <div className="space-y-2">
              {data.recentReferrals.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">{r.candidateName}</p>
                    <p className="text-xs text-muted-foreground">{r.roleTitle}</p>
                  </div>
                  <Badge variant="outline">{r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
