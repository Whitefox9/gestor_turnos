import { LogOut } from "lucide-react";
import { useAuthStore } from "@/app/store/auth.store";
import { Avatar } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { RoleMenu } from "./RoleMenu";

export function TopNavbar() {
  const session = useAuthStore((state) => state.session);
  const logout = useAuthStore((state) => state.logout);

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/88 px-6 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.3)] backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-sm font-semibold">{session?.tenant?.name ?? "Plataforma multi-tenant"}</p>
          <p className="text-xs text-muted-foreground">{session?.user.area ?? "Operacion hospitalaria"}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <RoleMenu />
        {session ? (
          <>
            <Avatar fallback={session.user.avatarFallback} />
            <div className="hidden text-right lg:block">
              <p className="text-sm font-medium">{session.user.fullName}</p>
              <p className="text-xs text-muted-foreground">{session.user.email}</p>
            </div>
          </>
        ) : null}
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Salir
        </Button>
      </div>
    </header>
  );
}
