import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/nav-bar";
import { UserMenu } from "@/components/user-menu";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <>
      <header className="relative flex items-center justify-center py-4">
        <NavBar />
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <UserMenu />
        </div>
      </header>
      {children}
    </>
  );
}
