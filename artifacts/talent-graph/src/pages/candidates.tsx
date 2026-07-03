import { useListCandidates } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export default function Candidates() {
  const { data, isLoading } = useListCandidates();

  if (isLoading) {
    return <Skeleton className="h-[500px] w-full rounded-xl" />;
  }

  return (
    <Card className="border-border">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h2 className="text-lg font-semibold">Candidates</h2>
        {/* Placeholder for Add Candidate button */}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Current Role</TableHead>
            <TableHead>Skills</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((candidate) => (
            <TableRow key={candidate.id} className="hover:bg-muted/50 cursor-pointer">
              <TableCell>
                <Link href={`/candidates/${candidate.id}`} className="font-medium hover:underline">
                  {candidate.name}
                </Link>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm">{candidate.currentTitle}</span>
                  <span className="text-xs text-muted-foreground">{candidate.currentCompany}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {candidate.topSkills?.slice(0, 3).map(skill => (
                    <Badge key={skill.id} variant="secondary" className="text-xs">
                      {skill.name}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{candidate.status}</Badge>
              </TableCell>
              <TableCell>
                {candidate.compositeScore ? (
                  <span className={`font-semibold ${candidate.compositeScore > 75 ? 'text-green-500' : 'text-yellow-500'}`}>
                    {candidate.compositeScore}
                  </span>
                ) : '-'}
              </TableCell>
            </TableRow>
          ))}
          {data?.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No candidates found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}