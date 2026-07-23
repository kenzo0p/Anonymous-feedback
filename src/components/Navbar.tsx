"use client";
import React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { User } from "next-auth";
import { Button } from "./ui/button";
import ThemeToggle from "./ThemeToggle";
import { Logo } from "./Logo";
import { Settings } from "lucide-react";

function Navbar() {
  const { data: session } = useSession();
  const user: User = session?.user;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group">
          <Logo />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {session ? (
            <>
              <Link
                href="/settings"
                className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
              >
                @{user?.username || user?.email}
              </Link>
              <Link
                href="/settings"
                aria-label="Settings"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
              </Link>
              <Button size="sm" variant="outline" onClick={() => signOut()}>
                Sign out
              </Button>
            </>
          ) : (
            <Link href="/sign-in">
              <Button size="sm">Sign in</Button>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
