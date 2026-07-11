"use client";

import { Avatar } from "@base-ui/react/avatar";
import { Menu } from "@base-ui/react/menu";
import { User, Settings, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const itemClass =
  "flex w-full cursor-default items-center gap-2 rounded-lg px-3 py-2 text-left outline-none select-none data-highlighted:bg-zinc-100 dark:data-highlighted:bg-zinc-800";

export function UserMenu({ avatarUrl = "" }: { avatarUrl?: string }) {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Account menu"
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-500"
      >
        <Avatar.Root className="inline-flex size-9 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 text-zinc-500 transition-colors select-none hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700">
          {avatarUrl ? (
            <Avatar.Image
              src={avatarUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : null}
          <Avatar.Fallback className="flex size-full items-center justify-center">
            <User className="size-5" />
          </Avatar.Fallback>
        </Avatar.Root>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner
          sideOffset={8}
          align="end"
          className="z-50 outline-none"
        >
          <Menu.Popup className="min-w-44 origin-[var(--transform-origin)] rounded-xl border border-zinc-200 bg-white p-1 text-sm text-zinc-900 shadow-lg outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50">
            <Menu.Item
              className={itemClass}
              onClick={() => router.push("/settings")}
            >
              <Settings className="size-4" />
              Settings
            </Menu.Item>
            <Menu.Separator className="my-1 h-px bg-zinc-200 dark:bg-zinc-800" />
            <Menu.Item onClick={logout} className={itemClass}>
              <LogOut className="size-4" />
              Log out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
