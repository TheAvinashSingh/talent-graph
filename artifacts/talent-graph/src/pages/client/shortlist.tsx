import { Link } from "wouter";
import { useListClientShortlist } from "@workspace/api-client-react";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientShortlist() {
  const { data, isLoading } = useListClientShortlist();

  if (isLoading) return <Skeleton className="h-[500px] w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Shortlisted Candidates</h1>
      <Card>
        <CardContent className="pt-6">
          {!data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No candidates have been shortlisted for your roles yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Current title</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Fit</TableHead>
                  <TableHead className="text-right">Dossier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c) => (
                  <TableRow key={`${c.candidateId}-${c.roleId}`}>
                    <TableCell className="font-medium">{c.candidateName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.currentTitle ?? "—"}
                    </TableCell>
                    <TableCell>{c.roleTitle}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.stage}</Badge>
                    </TableCell>
                    <TableCell>{c.compositeScore.toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dossier/${c.candidateId}/${c.roleId}`}>View</Link>
                      </Button>
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
