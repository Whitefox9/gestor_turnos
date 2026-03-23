import { Badge } from "@/shared/components/ui/badge";
import { ROLE_LABELS } from "@/shared/constants/roles";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";

export function RoleMenu() {
  const user = useCurrentUser();

  if (!user) {
    return null;
  }

  return <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>;
}
