import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Layout } from "@/components/layout";
import { AuthProvider, useAuth } from "@/lib/auth";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import VerifyEmail from "@/pages/verify-email";
import AcceptInvite from "@/pages/accept-invite";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";

import Dashboard from "@/pages/dashboard";
import Candidates from "@/pages/candidates";
import CandidateProfile from "@/pages/candidate-profile";
import CandidateDossier from "@/pages/candidate-dossier";
import Roles from "@/pages/roles";
import RoleDetail from "@/pages/role-detail";
import Clients from "@/pages/clients";
import ClientDetail from "@/pages/client-detail";
import TrustGraphExplorer from "@/pages/trust-graph";
import Referrals from "@/pages/referrals";
import Placements from "@/pages/placements";
import Analytics from "@/pages/analytics";
import People from "@/pages/people";

import ReferrerScore from "@/pages/portal/score";
import ReferrerRoles from "@/pages/portal/roles";
import ReferrerReferrals from "@/pages/portal/referrals";

import ClientRoles from "@/pages/client/roles";
import ClientShortlist from "@/pages/client/shortlist";
import ClientPlacements from "@/pages/client/placements";
import ClientDossier from "@/pages/client/dossier";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function AdminRoutes() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/candidates" component={Candidates} />
      <Route path="/candidates/:id" component={CandidateProfile} />
      <Route path="/candidates/:id/dossier/:roleId" component={CandidateDossier} />
      <Route path="/roles" component={Roles} />
      <Route path="/roles/:id" component={RoleDetail} />
      <Route path="/clients" component={Clients} />
      <Route path="/clients/:id" component={ClientDetail} />
      <Route path="/people" component={People} />
      <Route path="/trust-graph" component={TrustGraphExplorer} />
      <Route path="/referrals" component={Referrals} />
      <Route path="/placements" component={Placements} />
      <Route path="/analytics" component={Analytics} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ReferrerRoutes() {
  return (
    <Switch>
      <Route path="/" component={ReferrerScore} />
      <Route path="/roles" component={ReferrerRoles} />
      <Route path="/referrals" component={ReferrerReferrals} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ClientRoutes() {
  return (
    <Switch>
      <Route path="/" component={ClientRoles} />
      <Route path="/shortlist" component={ClientShortlist} />
      <Route path="/placements" component={ClientPlacements} />
      <Route path="/dossier/:candidateId/:roleId" component={ClientDossier} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/accept-invite" component={AcceptInvite} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route>
          <Redirect to="/login" />
        </Route>
      </Switch>
    );
  }

  return (
    <Switch>
      {/* Token-based pages remain reachable even when already signed in. */}
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/accept-invite" component={AcceptInvite} />
      <Route>
        <Layout>
          {user.role === "ADMIN" && <AdminRoutes />}
          {user.role === "REFERRER" && <ReferrerRoutes />}
          {user.role === "CLIENT" && <ClientRoutes />}
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="talent-graph-theme">
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
