"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { singInSchema } from "@/schemas/signInSchema";
import { signIn } from "next-auth/react";
import OAuthButtons from "@/components/OAuthButtons";

function SignInPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof singInSchema>>({
    resolver: zodResolver(singInSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof singInSchema>) => {
    setIsSubmitting(true);
    const result = await signIn("credentials", {
      redirect: false,
      identifier: data.identifier,
      password: data.password,
    });
    if (result?.error) {
      toast({
        title: "Sign-in failed",
        description: "Incorrect username or password",
        variant: "destructive",
      });
    } else if (result?.ok) {
      toast({
        title: "Signed in",
        description: "Welcome back.",
      });
      router.replace("/dashboard");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-16">
      <div className="pointer-events-none absolute inset-0 bg-grid" />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-8">
          <span className="eyebrow">Welcome back</span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Access your dashboard and read your messages.
          </p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              name="identifier"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email or username</FormLabel>
                  <FormControl>
                    <Input
                      className="h-10"
                      placeholder="you@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="password"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      className="h-10"
                      placeholder="Your password"
                      type="password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              className="h-10 w-full"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </Form>
        <OAuthButtons />
        <p className="mt-4 text-center text-sm">
          <Link
            href="/forgot-password"
            className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Forgot your password?
          </Link>
        </p>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/sign-up"
            className="font-medium text-foreground underline underline-offset-4 hover:text-brand"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignInPage;
