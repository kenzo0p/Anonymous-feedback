"use client";
import React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { User } from "next-auth";
import { Button } from "./ui/button";
import ThemeToggle from "./ThemeToggle";
import { Logo } from "./Logo";

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
              <span className="hidden text-sm text-muted-foreground sm:inline">
                @{user?.username || user?.email}
              </span>
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
