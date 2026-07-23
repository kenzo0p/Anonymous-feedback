import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import SendMessageForm from "./SendMessageForm";

type PageProps = { params: Promise<{ username: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const name = decodeURIComponent(username);
  return {
    title: `Send @${name} an anonymous message · Candor`,
    description: `Leave @${name} honest, anonymous feedback on Candor.`,
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const name = decodeURIComponent(username);

  await dbConnect();
  const user = await UserModel.findOne({ username: name })
    .select("username prompt isAcceptingMessages")
    .lean<{
      username: string;
      prompt?: string;
      isAcceptingMessages: boolean;
    } | null>();

  // Unknown profile.
  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <span className="eyebrow">Profile not found</span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          @{name} doesn&apos;t exist
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Double-check the link, or create your own message board.
        </p>
        <Link href="/sign-up" className="mt-6 inline-block">
          <Button>Create your account</Button>
        </Link>
      </div>
    );
  }

  const prompt = user.prompt?.trim();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      <div className="mb-8 text-center">
        <span className="eyebrow">
          {prompt ? `Message @${user.username}` : "Anonymous message"}
        </span>
        <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          {prompt ? (
            prompt
          ) : (
            <>
              Send <span className="text-brand">@{user.username}</span> a message
            </>
          )}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          They&apos;ll never know it was you.
        </p>
      </div>

      {user.isAcceptingMessages ? (
        <SendMessageForm username={user.username} />
      ) : (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium">Inbox paused</p>
          <p className="mt-1 text-sm text-muted-foreground">
            @{user.username} isn&apos;t accepting messages right now.
          </p>
        </div>
      )}

      <Separator className="my-12" />

      <div className="rounded-xl border border-border bg-muted/30 p-8 text-center">
        <h2 className="text-lg font-semibold tracking-tight">
          Get your own message board
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a free account and start collecting anonymous feedback.
        </p>
        <Link href="/sign-up" className="mt-5 inline-block">
          <Button>Create your account</Button>
        </Link>
      </div>
    </div>
  );
}
