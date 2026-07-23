'use client';
import { useState } from 'react';
import axios, { AxiosError } from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCompletion } from 'ai/react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import * as z from 'zod';
import { ApiResponse } from '@/types/ApiResponse';
import { messageSchema } from '@/schemas/messageSchema';
import { toast } from '@/hooks/use-toast';

const specialChar = '||';

const parseStringMessages = (messageString: string): string[] => {
  return messageString.split(specialChar).filter((m) => m.trim().length > 0);
};

const initialMessageString =
  "What's your favorite movie?||Do you have any pets?||What's your dream job?";

export default function SendMessageForm({ username }: { username: string }) {
  const {
    complete,
    completion,
    isLoading: isSuggestLoading,
    error,
  } = useCompletion({
    api: '/api/suggest-messages',
    // The route streams raw token text (Content-Type: text/plain), not the
    // AI SDK data-stream protocol, so consume it as a plain text stream.
    streamProtocol: 'text',
    initialCompletion: initialMessageString,
  });

  const form = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: { content: '' },
  });

  const messageContent = form.watch('content');

  const handleMessageClick = (message: string) => {
    form.setValue('content', message.trim());
  };

  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data: z.infer<typeof messageSchema>) => {
    setIsLoading(true);
    try {
      const response = await axios.post<ApiResponse>('/api/send-message', {
        ...data,
        username,
      });
      toast({
        title: response.data.message,
        variant: 'default',
      });
      form.reset({ content: '' });
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: 'Error',
        description:
          axiosError.response?.data.message ?? 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuggestedMessages = async () => {
    try {
      complete('');
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Write something honest…"
                      className="min-h-32 resize-none"
                      {...field}
                    />
                  </FormControl>
                  <div className="flex items-center justify-between">
                    <FormMessage />
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {messageContent?.length ?? 0}/300
                    </span>
                  </div>
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="h-10 w-full gap-2"
              disabled={isLoading || !messageContent}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Send anonymously
                </>
              )}
            </Button>
          </form>
        </Form>
      </div>

      {/* Suggestions */}
      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <span className="eyebrow">Need inspiration?</span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSuggestedMessages}
            disabled={isSuggestLoading}
            className="gap-2"
          >
            {isSuggestLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Suggest
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {error ? (
            <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              Couldn&apos;t load suggestions right now.
            </p>
          ) : (
            parseStringMessages(completion).map((message, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleMessageClick(message)}
                className="rounded-md border border-border bg-card p-3 text-left text-sm transition-colors hover:border-foreground/20 hover:bg-accent"
              >
                {message.trim()}
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
