import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useLogoutUser,
  useResendVerification,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useTheme } from "./theme-provider";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { MailWarning } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Building2,
  Network,
  UserPlus,
  BarChart3,
  Moon,
  Sun,
  LogOut,
  Award,
  ClipboardList,
  FileSearch,
  Contact,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  ADMIN: [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/candidates", label: "Candidates", icon: Users },
    { href: "/roles", label: "Roles", icon: Briefcase },
    { href: "/clients", label: "Clients", icon: Building2 },
    { href: "/people", label: "People", icon: Contact },
    { href: "/trust-graph", label: "Trust Graph", icon: Network },
    { href: "/referrals", label: "Referrals", icon: UserPlus },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
  ],
  REFERRER: [
    { href: "/", label: "My Scout Profile", icon: Award },
    { href: "/roles", label: "Open Roles", icon: Briefcase },
    { href: "/referrals", label: "My Referrals", icon: UserPlus },
  ],
  CLIENT: [
    { href: "/", label: "Our Roles", icon: Briefcase },
    { href: "/shortlist", label: "Shortlist", icon: ClipboardList },
    { href: "/placements", label: "Placements", icon: FileSearch },
  ],
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { mutateAsync: logout } = useLogoutUser();
  const { mutateAsync: resendVerification, isPending: isResending } =
    useResendVerification();

  const navItems = NAV_BY_ROLE[user?.role ?? "ADMIN"] ?? NAV_BY_ROLE.ADMIN;

  async function onResend() {
    try {
      const res = await resendVerification();
      toast({ title: res.message });
    } catch (err) {
      toast({
        title: "Could not resend verification email",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    }
  }

  const isActive = (href: string) =>
    location === href || (href !== "/" && location.startsWith(href));

  async function onLogout() {
    try {
      await logout();
    } catch {
      // ignore — clear session client-side regardless
    }
    await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    queryClient.clear();
    setLocation("/login");
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
            TalentGraph
          </span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.label}</span>
              </div>
            </Link>
          ))}
        </nav>
        {user && (
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-primary">
                  {initials(user.name)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user.role.toLowerCase()}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start mt-1 text-muted-foreground"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6 shrink-0">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            {navItems.find((i) => isActive(i.href))?.label || "Talent Graph"}
          </h1>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-muted/20 p-6">
          <div className="max-w-7xl mx-auto space-y-4">
            {user && !user.emailVerified && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                <MailWarning className="h-5 w-5 text-amber-500 shrink-0" />
                <p className="text-sm text-amber-200 flex-1">
                  Please verify your email address. We sent a link to{" "}
                  <span className="font-medium">{user.email}</span>.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onResend}
                  disabled={isResending}
                  className="border-amber-500/40 text-amber-100 hover:bg-amber-500/20 shrink-0"
                >
                  {isResending ? "Sending..." : "Resend email"}
                </Button>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
