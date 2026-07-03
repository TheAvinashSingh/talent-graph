import { useGetCandidateDossier, getGetCandidateDossierQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Award, Network } from "lucide-react";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

export default function CandidateDossier() {
  const params = useParams();
  const id = params.id as string;
  const roleId = params.roleId as string;

  const { data: dossier, isLoading } = useGetCandidateDossier(id, roleId, {
    query: {
      enabled: !!id && !!roleId,
      queryKey: getGetCandidateDossierQueryKey(id, roleId),
    }
  });

  if (isLoading) {
    return <Skeleton className="h-[800px] w-full rounded-xl" />;
  }

  if (!dossier) return <div>Dossier not found</div>;

  const radarData = [
    { subject: 'Role Fit', A: dossier.score.roleFitScore || 0, fullMark: 100 },
    { subject: 'Evidence', A: dossier.score.evidenceScore || 0, fullMark: 100 },
    { subject: 'Leadership', A: dossier.score.leadershipScore || 0, fullMark: 100 },
    { subject: 'Trust', A: dossier.score.trustScore || 0, fullMark: 100 },
    { subject: 'Evaluation', A: dossier.score.evaluationScore || 0, fullMark: 100 },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/candidates/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Button onClick={() => window.print()} variant="outline">
          <Download className="mr-2 h-4 w-4" /> Export PDF
        </Button>
      </div>

      <div className="bg-card text-card-foreground border border-border shadow-xl rounded-xl overflow-hidden print:shadow-none print:border-none">
        {/* Header */}
        <div className="bg-primary p-8 text-primary-foreground">
          <h1 className="text-4xl font-bold mb-2">{dossier.candidate.name}</h1>
          <p className="text-primary-foreground/80 text-lg">Prepared for: {dossier.role.clientName} • {dossier.role.title}</p>
          <div className="mt-6 flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-primary-foreground/70">Composite Score</span>
              <span className="text-3xl font-black">{dossier.score.compositeScore}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-primary-foreground/70">Comp Expectation</span>
              <span className="text-xl font-semibold">₹{dossier.candidate.compensationExpected} LPA</span>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Executive Summary */}
          <section>
            <h2 className="text-lg font-bold border-b pb-2 mb-4">Executive Summary</h2>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {dossier.professionalSummary}
            </p>
          </section>

          <div className="grid grid-cols-2 gap-8">
            {/* Radar Chart */}
            <section>
              <h2 className="text-lg font-bold border-b pb-2 mb-4">Assessment Profile</h2>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Candidate" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Impact Highlights */}
            <section>
              <h2 className="text-lg font-bold border-b pb-2 mb-4">Impact Highlights</h2>
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-muted/30 border-none shadow-none">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Award className="h-8 w-8 text-chart-2" />
                    <div>
                      <p className="text-2xl font-bold">{dossier.candidate.arrInfluenced ? `₹${dossier.candidate.arrInfluenced}Cr` : 'N/A'}</p>
                      <p className="text-xs text-muted-foreground uppercase">ARR Influenced</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30 border-none shadow-none">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Network className="h-8 w-8 text-chart-1" />
                    <div>
                      <p className="text-2xl font-bold">{dossier.candidate.teamSize || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground uppercase">Team Size</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              {dossier.candidate.impactSummary && (
                <p className="mt-4 text-sm text-muted-foreground italic">
                  "{dossier.candidate.impactSummary}"
                </p>
              )}
            </section>
          </div>

          {/* Recruiter Assessment */}
          {dossier.score.recruiterNotes && (
            <section className="bg-muted/20 p-6 rounded-lg border border-border">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                Recruiter Notes
              </h2>
              <p className="text-sm text-muted-foreground">{dossier.score.recruiterNotes}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}