import { useListClientPlacements } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
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

export default function ClientPlacements() {
  const { data, isLoading } = useListClientPlacements();

  if (isLoading) return <Skeleton className="h-[500px] w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Placements</h1>
      <Card>
        <CardContent className="pt-6">
          {!data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No placements yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Compensation</TableHead>
                  <TableHead>Join date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.candidateName}</TableCell>
                    <TableCell>{p.roleTitle}</TableCell>
                    <TableCell>₹{p.actualCompensation} LPA</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.joinDate ? new Date(p.joinDate).toLocaleDateString("en-IN") : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
