import { useGetPlatformPeople } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Award, Building2, Download } from "lucide-react";

function formatJoined(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function People() {
  const { data, isLoading } = useGetPlatformPeople();

  if (isLoading) {
    return <Skeleton className="h-[600px] w-full rounded-xl" />;
  }

  const referrers = data?.referrers ?? [];
  const clients = data?.clients ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">People on the platform</h1>
          <p className="text-muted-foreground">
            Everyone with an account: referrers scouting talent and clients
            hiring through Talent Graph.
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <a href="/api/admin/source-archive">
            <Download className="mr-2 h-4 w-4" />
            Download source (.zip)
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Referrer accounts</p>
              <p className="text-3xl font-bold">{referrers.length}</p>
            </div>
            <Award className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Client accounts</p>
              <p className="text-3xl font-bold">{clients.length}</p>
            </div>
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Referrers
          </CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Scout score</TableHead>
              <TableHead className="text-right">Submitted</TableHead>
              <TableHead className="text-right">Hired</TableHead>
              <TableHead className="text-right">Profile</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {referrers.map((r) => (
              <TableRow key={r.userId}>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    {r.name}
                    {r.isTalentScout && (
                      <Badge variant="default" className="h-4 px-1 text-[10px]">
                        SCOUT
                      </Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.email}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatJoined(r.joinedAt)}
                </TableCell>
                <TableCell className="text-right font-semibold text-primary">
                  {r.scoutScore}
                </TableCell>
                <TableCell className="text-right">{r.submitted}</TableCell>
                <TableCell className="text-right">{r.hired}</TableCell>
                <TableCell className="text-right">
                  {r.profileCompleteness != null
                    ? `${r.profileCompleteness}%`
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
            {referrers.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-muted-foreground"
                >
                  No referrer accounts yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            Clients
          </CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Active roles</TableHead>
              <TableHead className="text-right">Placements</TableHead>
              <TableHead className="text-right">Fees</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((c) => (
              <TableRow key={c.userId}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.companyName}</TableCell>
                <TableCell className="text-muted-foreground">{c.email}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatJoined(c.joinedAt)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{c.clientStatus}</Badge>
                </TableCell>
                <TableCell className="text-right">{c.activeRoles}</TableCell>
                <TableCell className="text-right">{c.totalPlacements}</TableCell>
                <TableCell className="text-right font-semibold text-primary">
                  ₹{c.totalFees.toFixed(2)} Cr
                </TableCell>
              </TableRow>
            ))}
            {clients.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-8 text-center text-muted-foreground"
                >
                  No client accounts yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
