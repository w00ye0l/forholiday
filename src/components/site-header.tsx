"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NavUser } from "@/components/nav-user";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

export function SiteHeader() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-10 w-full border-b bg-background">
      <div className="flex h-16 items-center gap-4 px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <div className="flex flex-1" />
        {user ? (
          <NavUser
            user={{
              name:
                user.user_metadata?.full_name ||
                user.email?.split("@")[0] ||
                "",
              email: user.email || "",
            }}
          />
        ) : (
          <Button
            variant="ghost"
            size="lg"
            onClick={() => router.push("/auth/login")}
            className="gap-2"
          >
            <LogIn className="size-4" />
            로그인
          </Button>
        )}
      </div>
    </header>
  );
}
