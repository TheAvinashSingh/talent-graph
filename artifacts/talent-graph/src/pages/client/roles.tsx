import { useListClientRoles } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientRoles() {
  const { data, isLoading } = useListClientRoles();

  if (isLoading) return <Skeleton className="h-[500px] w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Our Roles</h1>
      {!data || data.length === 0 ? (
        <p className="text-muted-foreground">You have no roles on the platform yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((role) => (
            <Card key={role.id}>
              <CardHeader>
                <CardTitle className="text-base">{role.title}</CardTitle>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="outline">{role.level}</Badge>
                  <Badge variant="outline">{role.department}</Badge>
                  <Badge variant={role.status === "PLACED" ? "secondary" : "default"}>
                    {role.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {role.location && (
                  <p className="text-sm text-muted-foreground">{role.location}</p>
                )}
                {role.compensationMin != null && role.compensationMax != null && (
                  <p className="text-sm">
                    ₹{role.compensationMin}–{role.compensationMax} LPA
                  </p>
                )}
                <div className="flex justify-between text-xs text-muted-foreground pt-1">
                  <span>{role.pipelineCount ?? 0} in pipeline</span>
                  {role.daysOpen != null && <span>{role.daysOpen} days open</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
