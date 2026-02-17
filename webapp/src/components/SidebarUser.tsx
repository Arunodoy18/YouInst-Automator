"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function SidebarUser() {
  const { data: session } = useSession();

  const name = session?.user?.name || session?.user?.email?.split("@")[0] || "User";
  const plan = (session?.user as any)?.plan || "free";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs font-bold">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        <p className="text-xs text-zinc-500 capitalize">{plan} Plan</p>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors rounded"
        title="Sign out"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}
