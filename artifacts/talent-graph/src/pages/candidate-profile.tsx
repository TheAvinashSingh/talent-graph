import { useGetCandidate, getGetCandidateQueryKey, useDeleteCandidate } from "@workspace/api-client-react";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Trash2, FileText } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function CandidateProfile() {
  const params = useParams();
  const id = params.id as string;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: candidate, isLoading } = useGetCandidate(id, {
    query: {
      enabled: !!id,
      queryKey: getGetCandidateQueryKey(id),
    }
  });

  const deleteMutation = useDeleteCandidate({
    mutation: {
      onSuccess: () => {
        toast({ title: "Candidate deleted" });
        setLocation("/candidates");
      }
    }
  });

  if (isLoading) {
    return <Skeleton className="h-[600px] w-full rounded-xl" />;
  }

  if (!candidate) return <div>Candidate not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/candidates")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{candidate.name}</h1>
          <Badge variant="outline">{candidate.status}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate({ id })}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Identity & Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Email:</span>
              <p>{candidate.email || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Phone:</span>
              <p>{candidate.phone || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Location:</span>
              <p>{candidate.location || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">LinkedIn:</span>
              <p className="text-blue-500 hover:underline cursor-pointer">{candidate.linkedinUrl || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Comp Expectation:</span>
              <p>{candidate.compensationExpected ? `₹${candidate.compensationExpected} LPA` : 'N/A'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Skills Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {candidate.skills?.map(skill => (
                <Badge key={skill.id} variant="secondary">
                  {skill.name} ({skill.proficiency}/5)
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Career Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {candidate.experiences?.map((exp, i) => (
                <div key={exp.id} className="border-l-2 border-primary/20 pl-4 py-2 relative">
                  <div className="absolute w-3 h-3 bg-primary rounded-full -left-[7px] top-4" />
                  <h4 className="font-semibold">{exp.title}</h4>
                  <p className="text-sm text-muted-foreground">{exp.company}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(exp.startDate).getFullYear()} - {exp.endDate ? new Date(exp.endDate).getFullYear() : 'Present'}
                  </p>
                  {exp.promoted && <Badge variant="default" className="mt-2 text-xs">Promoted</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}