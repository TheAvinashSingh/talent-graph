import { useListClients } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export default function Clients() {
  const { data, isLoading } = useListClients();

  if (isLoading) {
    return <Skeleton className="h-[500px] w-full rounded-xl" />;
  }

  return (
    <Card className="border-border">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h2 className="text-lg font-semibold">Clients</h2>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Industry</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Active Roles</TableHead>
            <TableHead>Placements</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((client) => (
            <TableRow key={client.id} className="hover:bg-muted/50 cursor-pointer">
              <TableCell>
                <Link href={`/clients/${client.id}`} className="font-medium hover:underline">
                  {client.companyName}
                </Link>
              </TableCell>
              <TableCell>{client.industry}</TableCell>
              <TableCell>
                <Badge variant={client.status === 'ACTIVE' ? 'default' : 'secondary'}>
                  {client.status}
                </Badge>
              </TableCell>
              <TableCell>{client.activeRoles || 0}</TableCell>
              <TableCell>{client.totalPlacements || 0}</TableCell>
            </TableRow>
          ))}
          {data?.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No clients found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}