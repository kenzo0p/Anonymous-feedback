'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ApiResponse } from '@/types/ApiResponse';
import { zodResolver } from '@hookform/resolvers/zod';
import axios, { AxiosError } from 'axios';
import { Download, Loader2, RefreshCcw, Search } from 'lucide-react';
import { User } from 'next-auth';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AcceptMessageSchema } from '@/schemas/acceptMessageSchema';
import { useToast } from '@/hooks/use-toast';
import { Message } from '@/model/Message.model';
import MessageCard from '@/components/MessageCard';
import ShareProfile from '@/components/ShareProfile';
import InboxStats from '@/components/InboxStats';

const PAGE_SIZE = 20;

function UserDashboard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSwitchLoading, setIsSwitchLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [statsKey, setStatsKey] = useState(0);
  const bumpStats = useCallback(() => setStatsKey((k) => k + 1), []);

  const { toast } = useToast();
  const { data: session } = useSession();

  // Debounce the search box so we don't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleDeleteMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((message) => message._id !== messageId));
    setTotal((t) => Math.max(0, t - 1));
    bumpStats();
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
        const params = new URLSearchParams({
          page: String(pageToLoad),
          limit: String(PAGE_SIZE),
        });
        if (debouncedQuery) params.set('q', debouncedQuery);
        if (sort === 'oldest') params.set('sort', 'oldest');
        const response = await axios.get<ApiResponse>(
          `/api/get-messages?${params.toString()}`
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
    [toast, debouncedQuery, sort]
  );

  const refresh = useCallback(async () => {
    await loadPage(1, false);
    bumpStats();
    toast({ title: 'Refreshed', description: 'Showing your latest messages.' });
  }, [loadPage, toast, bumpStats]);

  // Fetch the accept-messages setting once when the session is ready.
  useEffect(() => {
    if (!session || !session.user) return;
    fetchAcceptMessages();
  }, [session, fetchAcceptMessages]);

  // (Re)load page 1 whenever the session, search query, or sort changes.
  useEffect(() => {
    if (!session || !session.user) return;
    loadPage(1, false);
  }, [session, loadPage]);

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

  const exportMessages = () => {
    const a = document.createElement('a');
    a.href = '/api/export?format=csv';
    a.click();
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

      {/* Share link + QR */}
      <ShareProfile url={profileUrl} username={username ?? ""} />

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

      {/* Overview / analytics */}
      <div className="mt-4">
        <InboxStats refreshKey={statsKey} />
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={exportMessages}
            disabled={total === 0}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
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
      </div>

      {/* Search + sort */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages"
            aria-label="Search messages"
            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as 'newest' | 'oldest')}
          aria-label="Sort messages"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
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
                onSenderBlocked={() => {
                  loadPage(1, false);
                  bumpStats();
                }}
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
      ) : debouncedQuery ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium">No matches</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No messages match &ldquo;{debouncedQuery}&rdquo;.
          </p>
        </div>
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
