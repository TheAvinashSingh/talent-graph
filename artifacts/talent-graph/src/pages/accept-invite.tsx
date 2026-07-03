import { useState } from "react";
import { Link, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetInvite,
  useAcceptInvite,
  getGetInviteQueryKey,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export default function AcceptInvite() {
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") ?? "";
  const queryClient = useQueryClient();
  const {
    data: invite,
    isLoading,
    isError,
  } = useGetInvite(token, {
    query: { enabled: !!token, retry: false, queryKey: getGetInviteQueryKey(token) },
  });
  const { mutateAsync, isPending } = useAcceptInvite();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    try {
      await mutateAsync({ data: { token, password } });
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      window.location.href = import.meta.env.BASE_URL;
    } catch (err) {
      toast({
        title: "Could not activate account",
        description: err instanceof Error ? err.message : "The invitation may have expired",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/20 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
            TalentGraph
          </span>
          <CardTitle className="text-lg font-semibold pt-2">Activate your account</CardTitle>
        </CardHeader>
        <CardContent>
          {!token || isError ? (
            <div className="space-y-4">
              <p className="text-sm text-destructive">
                This invitation is invalid or has expired. Please ask your administrator to send a
                new one.
              </p>
              <Link href="/login" className="text-sm text-primary hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : isLoading ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Loading invitation...
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You have been invited to access the hiring portal for{" "}
                <span className="font-medium text-foreground">{invite?.companyName}</span> as{" "}
                <span className="font-medium text-foreground">{invite?.email}</span>. Set a password
                to activate your account.
              </p>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Activating..." : "Activate account"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
