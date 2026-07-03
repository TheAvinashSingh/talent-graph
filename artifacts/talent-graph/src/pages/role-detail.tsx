import { useGetRole, getGetRoleQueryKey, useGetRolePipeline, getGetRolePipelineQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function RoleDetail() {
  const params = useParams();
  const id = params.id as string;

  const { data: role, isLoading: isRoleLoading } = useGetRole(id, {
    query: {
      enabled: !!id,
      queryKey: getGetRoleQueryKey(id),
    }
  });

  const { data: pipeline, isLoading: isPipelineLoading } = useGetRolePipeline(id, {
    query: {
      enabled: !!id,
      queryKey: getGetRolePipelineQueryKey(id),
    }
  });

  if (isRoleLoading || isPipelineLoading) {
    return <Skeleton className="h-[600px] w-full rounded-xl" />;
  }

  if (!role) return <div>Role not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/roles">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{role.title}</h1>
          <p className="text-muted-foreground">{role.clientName} • {role.department} • {role.level}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Role Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm font-semibold text-muted-foreground">Compensation</span>
              <p>₹{role.compensationMin} - ₹{role.compensationMax} LPA</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-muted-foreground">Experience</span>
              <p>{role.experienceMin} - {role.experienceMax} years</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-muted-foreground">Must Haves</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {role.mustHaveSkills?.map(s => <Badge key={s} variant="default" className="text-xs">{s}</Badge>)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Pipeline Kanban</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex overflow-x-auto gap-4 pb-4 min-h-[400px]">
              {['SOURCED', 'SCREENED', 'EVALUATED', 'SHORTLISTED', 'INTERVIEWING', 'OFFERED', 'PLACED', 'REJECTED'].map(stage => {
                const candidatesInStage = pipeline?.filter(p => p.stage === stage) || [];
                return (
                  <div key={stage} className="min-w-[250px] bg-muted/30 rounded-lg p-3 shrink-0">
                    <h3 className="font-semibold text-sm mb-3 flex justify-between">
                      {stage} <span className="text-muted-foreground">{candidatesInStage.length}</span>
                    </h3>
                    <div className="space-y-2">
                      {candidatesInStage.map(c => (
                        <Card key={c.id} className="p-3 cursor-grab hover:border-primary/50 transition-colors">
                          <Link href={`/candidates/${c.candidateId}`} className="font-medium text-sm hover:underline block mb-1">
                            {c.candidateName}
                          </Link>
                          <p className="text-xs text-muted-foreground mb-2 truncate">{c.currentTitle || 'No title'}</p>
                          <div className="flex justify-between items-center mt-2">
                            <span className={`text-xs font-bold ${c.compositeScore > 75 ? 'text-green-500' : c.compositeScore > 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                              Score: {c.compositeScore}
                            </span>
                          </div>
                        </Card>
                      ))}
                      {candidatesInStage.length === 0 && (
                        <div className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-md">
                          Empty
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}