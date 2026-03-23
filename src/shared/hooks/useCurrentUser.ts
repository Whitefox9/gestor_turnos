import { useAuthStore } from "@/app/store/auth.store";

export function useCurrentUser() {
  return useAuthStore((state) => state.session?.user ?? null);
}
