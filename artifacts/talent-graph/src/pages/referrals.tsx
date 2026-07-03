import { useListReferrals, useGetLeaderboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy } from "lucide-react";

export default function Referrals() {
  const { data: referrals, isLoading: isRefLoading } = useListReferrals();
  const { data: leaderboard, isLoading: isLeadLoading } = useGetLeaderboard();

  if (isRefLoading || isLeadLoading) {
    return <Skeleton className="h-[600px] w-full rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Referral Network</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leaderboard?.map((entry, idx) => (
                <div key={entry.referrerId} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-muted-foreground w-4">{idx + 1}</span>
                    <div>
                      <p className="font-medium text-sm flex items-center gap-2">
                        {entry.name}
                        {entry.isTalentScout && <Badge variant="default" className="text-[10px] px-1 h-4">SCOUT</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">{entry.hired} Hired / {entry.submitted} Submitted</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{entry.scoutScore}</p>
                    <p className="text-[10px] text-muted-foreground">pts</p>
                  </div>
                </div>
              ))}
              {(!leaderboard || leaderboard.length === 0) && (
                <p className="text-muted-foreground text-center py-4">No leaderboard data.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Referrals</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Referrer</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrals?.map(ref => (
                <TableRow key={ref.id}>
                  <TableCell className="font-medium">{ref.candidateName}</TableCell>
                  <TableCell>{ref.roleTitle}</TableCell>
                  <TableCell>{ref.referrerName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{ref.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(!referrals || referrals.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No referrals found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}