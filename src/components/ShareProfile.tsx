"use client";
import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Check, Copy, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ShareProfile({
  url,
  username,
}: {
  url: string;
  username: string;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied", description: "Profile URL is on your clipboard." });
    } catch {
      toast({ title: "Couldn't copy", variant: "destructive" });
    }
  };

  const share = async () => {
    const data = {
      title: "Send me anonymous feedback",
      text: `Send @${username} an anonymous message on Candor`,
      url,
    };
    // Web Share where available (mostly mobile / secure contexts); else copy.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(data);
      } catch {
        /* user dismissed — no-op */
      }
    } else {
      copy();
    }
  };

  const downloadQr = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `candor-${username}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="rounded-xl border border-border p-6">
      <h2 className="text-sm font-semibold">Your public link</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Share it anywhere, or let people scan the code to reach you.
      </p>

      <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-start">
        {/* QR code — kept on white so it scans in either theme */}
        <div className="flex flex-col items-center gap-2">
          <div
            ref={qrRef}
            className="rounded-lg border border-border bg-white p-3"
          >
            <QRCodeCanvas value={url} size={128} marginSize={0} level="M" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground"
            onClick={downloadQr}
          >
            <Download className="h-3.5 w-3.5" /> Download
          </Button>
        </div>

        {/* URL + actions */}
        <div className="flex flex-1 flex-col gap-2">
          <input
            type="text"
            value={url}
            readOnly
            aria-label="Your public link"
            className="h-10 w-full rounded-md border border-input bg-muted/50 px-3 font-mono text-sm text-muted-foreground focus:outline-none"
          />
          <div className="flex gap-2">
            <Button onClick={copy} className="h-10 flex-1 gap-2">
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
            <Button
              onClick={share}
              variant="outline"
              className="h-10 flex-1 gap-2"
            >
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
