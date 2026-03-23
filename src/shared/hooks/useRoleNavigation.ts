import { NAVIGATION_ITEMS } from "@/shared/constants/navigation";
import { useCurrentUser } from "./useCurrentUser";

export function useRoleNavigation() {
  const user = useCurrentUser();
  return NAVIGATION_ITEMS.filter((item) => (user ? item.roles.includes(user.role) : false));
}
