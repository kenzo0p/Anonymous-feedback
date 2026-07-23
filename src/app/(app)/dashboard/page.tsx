'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ApiResponse } from '@/types/ApiResponse';
import { zodResolver } from '@hookform/resolvers/zod';
import axios, { AxiosError } from 'axios';
import { Check, Copy, Loader2, RefreshCcw } from 'lucide-react';
import { User } from 'next-auth';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AcceptMessageSchema } from '@/schemas/acceptMessageSchema';
import { useToast } from '@/hooks/use-toast';
import { Message } from '@/model/Message.model';
import MessageCard from '@/components/MessageCard';

const PAGE_SIZE = 20;

function UserDashboard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSwitchLoading, setIsSwitchLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { toast } = useToast();
  const { data: session } = useSession();

  const handleDeleteMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((message) => message._id !== messageId));
    setTotal((t) => Math.max(0, t - 1));
  };

  const form = useForm({
    resolver: zodResolver(AcceptMessageSchema),
  });

  const { register, watch, setValue } = form;
  const acceptMessages = watch('acceptMessages');

  const fetchAcceptMessages = useCallback(async () => {
    setIsSwitchLoading(true);
    try {
      const response = await axios.get<ApiResponse>('/api/accept-messages');
      setValue('acceptMessages', response.data.isAcceptingMessages);
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: 'Error',
        description:
          axiosError.response?.data.message ??
          'Failed to fetch message settings',
        variant: 'destructive',
      });
    } finally {
      setIsSwitchLoading(false);
    }
  }, [setValue, toast]);

  const loadPage = useCallback(
    async (pageToLoad: number, append: boolean) => {
      if (append) setIsLoadingMore(true);
      else setIsLoading(true);
      try {
        const response = await axios.get<ApiResponse>(
          `/api/get-messages?page=${pageToLoad}&limit=${PAGE_SIZE}`
        );
        const incoming = response.data.messages || [];
        setMessages((prev) => (append ? [...prev, ...incoming] : incoming));
        setTotal(response.data.total ?? incoming.length);
        setHasMore(Boolean(response.data.hasMore));
        setPage(pageToLoad);
      } catch (error) {
        const axiosError = error as AxiosError<ApiResponse>;
        toast({
          title: 'Error',
          description:
            axiosError.response?.data.message ?? 'Failed to fetch messages',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [toast]
  );

  const refresh = useCallback(async () => {
    await loadPage(1, false);
    toast({ title: 'Refreshed', description: 'Showing your latest messages.' });
  }, [loadPage, toast]);

  useEffect(() => {
    if (!session || !session.user) return;
    loadPage(1, false);
    fetchAcceptMessages();
  }, [session, loadPage, fetchAcceptMessages]);

  const handleSwitchChange = async () => {
    try {
      const response = await axios.post<ApiResponse>('/api/accept-messages', {
        acceptMessages: !acceptMessages,
      });
      setValue('acceptMessages', !acceptMessages);
      toast({
        title: response.data.message,
        variant: 'default',
      });
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: 'Error',
        description:
          axiosError.response?.data.message ??
          'Failed to update message settings',
        variant: 'destructive',
      });
    }
  };

  if (!session || !session.user) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-24 text-center">
        <div>
          <span className="eyebrow">Not signed in</span>
          <p className="mt-3 text-muted-foreground">
            Please sign in to view your dashboard.
          </p>
        </div>
      </div>
    );
  }

  const { username } = session.user as User;

  const baseUrl = `${window.location.protocol}//${window.location.host}`;
  const profileUrl = `${baseUrl}/u/${username}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Link copied',
      description: 'Your profile URL is on the clipboard.',
    });
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="mb-10">
        <span className="eyebrow">Dashboard</span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          @{username}
        </h1>
      </div>

      {/* Share link */}
      <div className="rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold">Your public link</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Share this anywhere to start receiving anonymous messages.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={profileUrl}
            readOnly
            className="h-10 w-full flex-1 rounded-md border border-input bg-muted/50 px-3 font-mono text-sm text-muted-foreground focus:outline-none"
          />
          <Button onClick={copyToClipboard} className="h-10 gap-2 sm:w-32">
            {copied ? (
              <>
                <Check className="h-4 w-4" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copy
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Accept messages toggle */}
      <div className="mt-4 flex items-center justify-between rounded-xl border border-border p-6">
        <div>
          <h2 className="text-sm font-semibold">Accept messages</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {acceptMessages
              ? 'Your inbox is open — anyone with the link can message you.'
              : 'Your inbox is paused — new messages are turned off.'}
          </p>
        </div>
        <Switch
          {...register('acceptMessages')}
          checked={acceptMessages}
          onCheckedChange={handleSwitchChange}
          disabled={isSwitchLoading}
        />
      </div>

      <Separator className="my-10" />

      {/* Messages */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Messages</h2>
          <span className="font-mono text-sm text-muted-foreground">
            {total}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={(e) => {
            e.preventDefault();
            refresh();
          }}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {isLoading && messages.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : messages.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {messages.map((message) => (
              <MessageCard
                key={message._id as string}
                message={message}
                onMessageDelete={handleDeleteMessage}
              />
            ))}
          </div>
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => loadPage(page + 1, true)}
                disabled={isLoadingMore}
              >
                {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                Load more
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium">No messages yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Share your link to start the conversation.
          </p>
        </div>
      )}
    </div>
  );
}

export default UserDashboard;
