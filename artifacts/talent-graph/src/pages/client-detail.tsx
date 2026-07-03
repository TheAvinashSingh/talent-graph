import { useState } from "react";
import {
  useGetClient,
  useInviteClientUser,
  getGetClientQueryKey,
} from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, UserPlus } from "lucide-react";

function InviteUserDialog({ clientId, companyName }: { clientId: string; companyName: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const { mutateAsync, isPending } = useInviteClientUser();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await mutateAsync({ id: clientId, data: { name, email } });
      toast({ title: res.message });
      setOpen(false);
      setName("");
      setEmail("");
    } catch (err) {
      toast({
        title: "Could not send invitation",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="h-4 w-4 mr-2" /> Invite user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a user to {companyName}</DialogTitle>
          <DialogDescription>
            They will receive an email with a link to set their password and access this company's
            hiring portal.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-name">Full name</Label>
            <Input
              id="invite-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Sending..." : "Send invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ClientDetail() {
  const params = useParams();
  const id = params.id as string;

  const { data: client, isLoading } = useGetClient(id, {
    query: {
      enabled: !!id,
      queryKey: getGetClientQueryKey(id),
    }
  });

  if (isLoading) {
    return <Skeleton className="h-[600px] w-full rounded-xl" />;
  }

  if (!client) return <div>Client not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/clients">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{client.companyName}</h1>
          <p className="text-muted-foreground">{client.industry} • {client.size || 'Size unknown'}</p>
        </div>
        <div className="ml-auto">
          <InviteUserDialog clientId={id} companyName={client.companyName} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div><span className="text-muted-foreground">Name:</span> {client.contactName}</div>
            <div><span className="text-muted-foreground">Email:</span> {client.contactEmail}</div>
            <div><span className="text-muted-foreground">Phone:</span> {client.contactPhone || 'N/A'}</div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Active Roles</CardTitle>
          </CardHeader>
          <CardContent>
            {client.roles && client.roles.length > 0 ? (
              <div className="space-y-2">
                {client.roles.map(role => (
                  <div key={role.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <Link href={`/roles/${role.id}`} className="font-medium hover:underline">{role.title}</Link>
                    <Badge variant="outline">{role.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No active roles.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}