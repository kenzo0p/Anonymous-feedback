"use client";
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
import { Button } from "./ui/button";
import { Ban, Trash2 } from "lucide-react";
import { Message } from "@/model/Message.model";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { ApiResponse } from "@/types/ApiResponse";

type MessageCardProps = {
  message: Message;
  onMessageDelete: (messageId: string) => void;
  onSenderBlocked: () => void;
};

function formatDate(value: Date | string) {
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function MessageCard({
  message,
  onMessageDelete,
  onSenderBlocked,
}: MessageCardProps) {
  const { toast } = useToast();

  const handleDeleteConfirm = async () => {
    try {
      const response = await axios.delete<ApiResponse>(
        `/api/delete-message/${message._id}`
      );
      toast({ title: response.data.message });
      onMessageDelete(message._id as string);
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete message.",
        variant: "destructive",
      });
    }
  };

  const handleBlockConfirm = async () => {
    try {
      const response = await axios.post<ApiResponse>("/api/block-sender", {
        messageId: message._id,
      });
      toast({ title: response.data.message });
      onSenderBlocked();
    } catch (error) {
      const message =
        (error as { response?: { data?: ApiResponse } })?.response?.data
          ?.message ?? "Failed to block sender.";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  return (
    <div className="group relative flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/20">
      <p className="text-balance text-sm leading-relaxed">{message.content}</p>

      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-muted-foreground">
          {formatDate(message.createdAt)}
        </span>

        <div className="flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          {/* Block sender */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                aria-label="Block sender"
              >
                <Ban className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Block this sender?</AlertDialogTitle>
                <AlertDialogDescription>
                  Future messages from this sender will be blocked, and every
                  message they&apos;ve already sent you will be removed. They
                  won&apos;t be notified.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBlockConfirm}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Block sender
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Delete message */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                aria-label="Delete message"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this message?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This message will be permanently
                  removed from your inbox.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteConfirm}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

export default MessageCard;
