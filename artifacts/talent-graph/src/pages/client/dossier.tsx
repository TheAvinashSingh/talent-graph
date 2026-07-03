import { Link, useParams } from "wouter";
import { useGetClientDossier } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value.toFixed(1)}</span>
    </div>
  );
}

export default function ClientDossier() {
  const params = useParams();
  const candidateId = params.candidateId ?? "";
  const roleId = params.roleId ?? "";
  const { data, isLoading, isError } = useGetClientDossier(candidateId, roleId);

  if (isLoading) return <Skeleton className="h-[600px] w-full rounded-xl" />;
  if (isError || !data) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/shortlist">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Link>
        </Button>
        <p className="text-muted-foreground">
          This dossier is not available for your account.
        </p>
      </div>
    );
  }

  const { candidate, role, score, professionalSummary, endorsers } = data;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/shortlist">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to shortlist
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{candidate.name}</h1>
          <p className="text-muted-foreground">
            Considered for {role.title}
          </p>
        </div>
        <Badge variant="outline" className="text-base px-3 py-1">
          Composite {score.compositeScore.toFixed(1)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Professional summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {professionalSummary}
            </p>
            {candidate.skills && candidate.skills.length > 0 && (
              <>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((s) => (
                    <Badge key={s.id} variant="secondary">
                      {s.name}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fit breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ScoreRow label="Role fit" value={score.roleFitScore ?? 0} />
            <ScoreRow label="Evidence" value={score.evidenceScore ?? 0} />
            <ScoreRow label="Leadership" value={score.leadershipScore ?? 0} />
            <ScoreRow label="Trust" value={score.trustScore ?? 0} />
            <ScoreRow label="Evaluation" value={score.evaluationScore ?? 0} />
            <Separator className="my-2" />
            <ScoreRow label="Composite" value={score.compositeScore} />
          </CardContent>
        </Card>
      </div>

      {endorsers && endorsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Endorsed by</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {endorsers.map((e) => (
                <Badge key={e.id} variant="outline">
                  {e.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
