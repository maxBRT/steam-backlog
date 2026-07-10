import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { LogoutButton } from "@/components/logout-button"

export default async function ProtectedPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims) {
    redirect("/auth/login")
  }

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-6 p-6">
      <p className="text-sm text-muted-foreground">
        Signed in as {data.claims.email}
      </p>
      <LogoutButton />
    </div>
  )
}
