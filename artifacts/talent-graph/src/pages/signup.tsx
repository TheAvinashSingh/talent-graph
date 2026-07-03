import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useRegisterUser, getGetMeQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export default function Signup() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useRegisterUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [created, setCreated] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await mutateAsync({
        data: {
          name,
          email,
          password,
          role: "REFERRER",
        },
      });
      setCreated(true);
    } catch (err) {
      toast({
        title: "Could not create account",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    }
  }

  async function onContinue() {
    await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    setLocation("/");
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/20 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
            TalentGraph
          </span>
          <CardTitle className="text-lg font-semibold pt-2">Create referrer account</CardTitle>
        </CardHeader>
        <CardContent>
          {created ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your account has been created. We have sent a verification link to{" "}
                <span className="font-medium text-foreground">{email}</span>. Verify your email to
                fully activate your account — you can continue in the meantime.
              </p>
              <Button className="w-full" onClick={onContinue}>
                Continue
              </Button>
            </div>
          ) : (
          <>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
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
            <p className="text-sm text-muted-foreground">
              Signing up creates a referrer account so you can refer candidates. Hiring companies
              join by invitation from an administrator.
            </p>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Creating..." : "Create account"}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
          </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
