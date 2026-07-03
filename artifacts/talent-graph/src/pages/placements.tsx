import { useListPlacements } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Placements() {
  const { data, isLoading } = useListPlacements();

  if (isLoading) {
    return <Skeleton className="h-[500px] w-full rounded-xl" />;
  }

  return (
    <Card className="border-border">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Closed Placements</h2>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Candidate</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Comp</TableHead>
            <TableHead>Fee Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((placement) => (
            <TableRow key={placement.id} className="hover:bg-muted/50">
              <TableCell className="font-medium">{placement.candidateName}</TableCell>
              <TableCell>{placement.roleTitle}</TableCell>
              <TableCell>{placement.clientName}</TableCell>
              <TableCell>₹{placement.actualCompensation} LPA</TableCell>
              <TableCell className="font-semibold text-primary">₹{placement.feeAmount.toFixed(2)} Cr</TableCell>
              <TableCell>
                <Badge variant={placement.status === 'CONFIRMED' ? 'default' : 'outline'}>
                  {placement.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
          {(!data || data.length === 0) && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No placements found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}