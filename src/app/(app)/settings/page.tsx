"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios, { AxiosError } from "axios";
import { useSession, signOut } from "next-auth/react";
import { User } from "next-auth";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ApiResponse } from "@/types/ApiResponse";
import { updateUsernameSchema } from "@/schemas/updateUsernameSchema";
import { changePasswordSchema } from "@/schemas/changePasswordSchema";

function SettingsPage() {
  const { data: session, update } = useSession();
  const { toast } = useToast();

  const [savingUsername, setSavingUsername] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [savingDigest, setSavingDigest] = useState(false);

  useEffect(() => {
    let active = true;
    axios
      .get<{ prompt?: string }>("/api/update-prompt")
      .then((res) => {
        if (active) setPrompt(res.data.prompt ?? "");
      })
      .catch(() => {});
    axios
      .get<{ digestEnabled?: boolean }>("/api/update-digest")
      .then((res) => {
        if (active) setDigestEnabled(res.data.digestEnabled ?? true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const onToggleDigest = async (enabled: boolean) => {
    setDigestEnabled(enabled); // optimistic
    setSavingDigest(true);
    try {
      const res = await axios.post<ApiResponse>("/api/update-digest", {
        enabled,
      });
      toast({ title: res.data.message });
    } catch {
      setDigestEnabled(!enabled); // revert
      toast({
        title: "Couldn't update preference",
        variant: "destructive",
      });
    } finally {
      setSavingDigest(false);
    }
  };

  const usernameForm = useForm<z.infer<typeof updateUsernameSchema>>({
    resolver: zodResolver(updateUsernameSchema),
    values: { username: (session?.user as User)?.username ?? "" },
  });

  const passwordForm = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  if (!session || !session.user) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-24 text-center">
        <div>
          <span className="eyebrow">Not signed in</span>
          <p className="mt-3 text-muted-foreground">
            Please sign in to manage your account.
          </p>
        </div>
      </div>
    );
  }

  const user = session.user as User;

  const onUpdateUsername = async (
    data: z.infer<typeof updateUsernameSchema>
  ) => {
    setSavingUsername(true);
    try {
      const res = await axios.post<ApiResponse>("/api/update-username", data);
      await update({ username: data.username });
      toast({ title: "Saved", description: res.data.message });
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Couldn't update username",
        description: axiosError.response?.data.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingUsername(false);
    }
  };

  const onSavePrompt = async () => {
    setSavingPrompt(true);
    try {
      const res = await axios.post<ApiResponse>("/api/update-prompt", {
        prompt,
      });
      toast({ title: "Saved", description: res.data.message });
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Couldn't save prompt",
        description: axiosError.response?.data.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingPrompt(false);
    }
  };

  const onChangePassword = async (
    data: z.infer<typeof changePasswordSchema>
  ) => {
    setSavingPassword(true);
    try {
      const res = await axios.post<ApiResponse>("/api/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast({ title: "Saved", description: res.data.message });
      passwordForm.reset();
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Couldn't change password",
        description: axiosError.response?.data.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const onDeleteAccount = async () => {
    setDeleting(true);
    try {
      await axios.delete<ApiResponse>("/api/delete-account", {
        data: { password: deletePassword },
      });
      toast({ title: "Account deleted", description: "Sorry to see you go." });
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Couldn't delete account",
        description: axiosError.response?.data.message ?? "Please try again.",
        variant: "destructive",
      });
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <span className="eyebrow">Settings</span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Account
        </h1>
      </div>

      {/* Profile */}
      <section className="rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your email is{" "}
          <span className="font-medium text-foreground">
            {user.email ?? "—"}
          </span>
          .
        </p>
        <Form {...usernameForm}>
          <form
            onSubmit={usernameForm.handleSubmit(onUpdateUsername)}
            className="mt-5 space-y-4"
          >
            <FormField
              name="username"
              control={usernameForm.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input className="h-10" placeholder="your-handle" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="h-10" disabled={savingUsername}>
              {savingUsername && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save username
            </Button>
          </form>
        </Form>
      </section>

      {/* Public prompt */}
      <section className="mt-4 rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold">Public prompt</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Shown as the headline on your public page. Leave blank for the
          default.
        </p>
        <div className="mt-5 space-y-2">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, 150))}
            placeholder="e.g. Ask me anything about my conference talk"
            className="min-h-20 resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-muted-foreground">
              {prompt.length}/150
            </span>
            <Button
              type="button"
              className="h-10"
              onClick={onSavePrompt}
              disabled={savingPrompt}
            >
              {savingPrompt && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save prompt
            </Button>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="mt-4 flex items-center justify-between rounded-xl border border-border p-6">
        <div>
          <h2 className="text-sm font-semibold">Email digest</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Get a periodic email summarizing your new anonymous messages.
          </p>
        </div>
        <Switch
          checked={digestEnabled}
          onCheckedChange={onToggleDigest}
          disabled={savingDigest}
          aria-label="Toggle email digest"
        />
      </section>

      {/* Security */}
      <section className="mt-4 rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold">Change password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use a strong password you don&apos;t reuse elsewhere.
        </p>
        <Form {...passwordForm}>
          <form
            onSubmit={passwordForm.handleSubmit(onChangePassword)}
            className="mt-5 space-y-4"
          >
            <FormField
              name="currentPassword"
              control={passwordForm.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current password</FormLabel>
                  <FormControl>
                    <Input className="h-10" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="newPassword"
              control={passwordForm.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input className="h-10" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="confirmPassword"
              control={passwordForm.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <Input className="h-10" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="h-10" disabled={savingPassword}>
              {savingPassword && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update password
            </Button>
          </form>
        </Form>
      </section>

      <Separator className="my-10" />

      {/* Danger zone */}
      <section className="rounded-xl border border-destructive/40 p-6">
        <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently delete your account and all of your messages. This cannot
          be undone.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="mt-5 h-10">
              Delete account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes your account and every message you have
                received. Enter your password to confirm.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              type="password"
              placeholder="Your password"
              className="h-10"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletePassword("")}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  onDeleteAccount();
                }}
                disabled={deleting || !deletePassword}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}

export default SettingsPage;
