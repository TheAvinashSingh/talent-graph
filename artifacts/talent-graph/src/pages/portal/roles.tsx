import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListPortalRoles,
  useCreateMyReferral,
  getListPortalRolesQueryKey,
  getListMyReferralsQueryKey,
  getGetMyScoutScoreQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface PortalRole {
  id: string;
  title: string;
  level: string;
  department: string;
  industry: string;
  location?: string | null;
  compensationMin?: number;
  compensationMax?: number;
  referralsRemaining: number;
  myReferralCount: number;
}

export default function ReferrerRoles() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useListPortalRoles();
  const { mutateAsync, isPending } = useCreateMyReferral();
  const [active, setActive] = useState<PortalRole | null>(null);
  const [form, setForm] = useState({
    candidateName: "",
    candidateEmail: "",
    candidatePhone: "",
    candidateLinkedin: "",
    note: "",
  });

  function open(role: PortalRole) {
    setForm({ candidateName: "", candidateEmail: "", candidatePhone: "", candidateLinkedin: "", note: "" });
    setActive(role);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!active) return;
    try {
      await mutateAsync({
        data: {
          roleId: active.id,
          candidateName: form.candidateName,
          candidateEmail: form.candidateEmail || null,
          candidatePhone: form.candidatePhone || null,
          candidateLinkedin: form.candidateLinkedin || null,
          note: form.note || null,
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListPortalRolesQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListMyReferralsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetMyScoutScoreQueryKey() }),
      ]);
      toast({ title: "Referral submitted", description: `${form.candidateName} referred for ${active.title}` });
      setActive(null);
    } catch (err) {
      toast({
        title: "Referral blocked",
        description: err instanceof Error ? err.message : "Could not submit referral",
        variant: "destructive",
      });
    }
  }

  if (isLoading) return <Skeleton className="h-[500px] w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Open Roles</h1>
      {!data || data.length === 0 ? (
        <p className="text-muted-foreground">No roles are open to the referral network right now.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((role) => (
            <Card key={role.id}>
              <CardHeader>
                <CardTitle className="text-base">{role.title}</CardTitle>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="secondary">{role.industry}</Badge>
                  <Badge variant="outline">{role.level}</Badge>
                  <Badge variant="outline">{role.department}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {role.location && (
                  <p className="text-sm text-muted-foreground">{role.location}</p>
                )}
                {role.compensationMin != null && role.compensationMax != null && (
                  <p className="text-sm">
                    ₹{role.compensationMin}–{role.compensationMax} LPA
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {role.referralsRemaining} referral(s) remaining
                </p>
                <Button
                  className="w-full"
                  disabled={role.referralsRemaining <= 0}
                  onClick={() => open(role as PortalRole)}
                >
                  {role.referralsRemaining <= 0 ? "Limit reached" : "Refer a candidate"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={active !== null} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refer a candidate{active ? ` — ${active.title}` : ""}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cn">Candidate name</Label>
              <Input
                id="cn"
                value={form.candidateName}
                onChange={(e) => setForm({ ...form, candidateName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ce">Email</Label>
              <Input
                id="ce"
                type="email"
                value={form.candidateEmail}
                onChange={(e) => setForm({ ...form, candidateEmail: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cp">Phone</Label>
                <Input
                  id="cp"
                  value={form.candidatePhone}
                  onChange={(e) => setForm({ ...form, candidatePhone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cl">LinkedIn</Label>
                <Input
                  id="cl"
                  value={form.candidateLinkedin}
                  onChange={(e) => setForm({ ...form, candidateLinkedin: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nt">Why are they a good fit?</Label>
              <Textarea
                id="nt"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Submitting..." : "Submit referral"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
