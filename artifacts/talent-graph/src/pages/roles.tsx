import { useListRoles } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export default function Roles() {
  const { data, isLoading } = useListRoles();

  if (isLoading) {
    return <Skeleton className="h-[500px] w-full rounded-xl" />;
  }

  return (
    <Card className="border-border">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h2 className="text-lg font-semibold">Roles</h2>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Department & Level</TableHead>
            <TableHead>Comp Range</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((role) => (
            <TableRow key={role.id} className="hover:bg-muted/50 cursor-pointer">
              <TableCell>
                <Link href={`/roles/${role.id}`} className="font-medium hover:underline">
                  {role.title}
                </Link>
              </TableCell>
              <TableCell>{role.clientName}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm">{role.department}</span>
                  <span className="text-xs text-muted-foreground">{role.level}</span>
                </div>
              </TableCell>
              <TableCell>
                {role.compensationMin && role.compensationMax 
                  ? `₹${role.compensationMin} - ₹${role.compensationMax} LPA` 
                  : 'N/A'}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{role.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
          {data?.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No roles found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}