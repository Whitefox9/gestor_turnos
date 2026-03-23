import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.12),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(14,116,144,0.12),transparent_25%)]" />
      <div className="relative w-full max-w-md">
        <Outlet />
      </div>
    </main>
  );
}
