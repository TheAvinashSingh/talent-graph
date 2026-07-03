import { useEffect, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useVerifyEmail, getGetMeQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Status = "verifying" | "success" | "error";

export default function VerifyEmail() {
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") ?? "";
  const queryClient = useQueryClient();
  const { mutateAsync } = useVerifyEmail();
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing its token.");
      return;
    }
    (async () => {
      try {
        await mutateAsync({ data: { token } });
        await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setStatus("success");
      } catch (err) {
        setStatus("error");
        setMessage(
          err instanceof Error ? err.message : "This verification link is invalid or has expired.",
        );
      }
    })();
  }, [token, mutateAsync, queryClient]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/20 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
            TalentGraph
          </span>
          <CardTitle className="text-lg font-semibold pt-2">Email verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "verifying" && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Verifying your email...
            </div>
          )}
          {status === "success" && (
            <>
              <p className="text-sm text-muted-foreground">
                Your email has been verified. Your account is now fully active.
              </p>
              <Link href="/">
                <Button className="w-full">Continue</Button>
              </Link>
            </>
          )}
          {status === "error" && (
            <>
              <p className="text-sm text-destructive">{message}</p>
              <Link href="/login" className="text-sm text-primary hover:underline">
                Back to sign in
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
