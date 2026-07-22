"use client";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import messages from "@/messages.json";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight, Link2, MessageSquareQuote, Shield } from "lucide-react";
import { Logo } from "@/components/Logo";

const steps = [
  {
    icon: Link2,
    title: "Claim your link",
    body: "Sign up and get a personal URL you can share anywhere.",
  },
  {
    icon: MessageSquareQuote,
    title: "Collect messages",
    body: "Anyone can send you honest, anonymous feedback — no account needed.",
  },
  {
    icon: Shield,
    title: "Stay in control",
    body: "Read, manage, and delete messages from a private dashboard.",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-grid" />
        <main className="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:py-32">
          <span className="eyebrow mb-6">Anonymous · Honest · Yours</span>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            Feedback so honest,
            <br />
            it stays a secret.
          </h1>
          <p className="mt-6 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
            Candor gives you a link to collect anonymous messages from anyone.
            No names attached — just real thoughts, delivered to you.
          </p>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Link href="/sign-up">
              <Button size="lg" className="gap-2">
                Get your link <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline">
                Sign in
              </Button>
            </Link>
          </div>
        </main>
      </section>

      {/* How it works */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <span className="eyebrow">How it works</span>
          <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="bg-background p-8">
                <div className="flex items-center justify-between">
                  <step.icon className="h-5 w-5" strokeWidth={1.5} />
                  <span className="font-mono text-xs text-muted-foreground">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <span className="eyebrow">What people send</span>
          <Carousel
            className="mt-8 w-full"
            opts={{ align: "start", loop: true }}
            plugins={[Autoplay({ delay: 2600 })]}
          >
            <CarouselContent className="-ml-4">
              {messages.map((message, index) => (
                <CarouselItem
                  key={index}
                  className="pl-4 sm:basis-1/2 lg:basis-1/3"
                >
                  <Card className="h-full border-border shadow-none">
                    <CardContent className="flex h-full flex-col justify-between gap-6 p-6">
                      <p className="text-balance text-lg font-medium leading-snug tracking-tight">
                        &ldquo;{message.content}&rdquo;
                      </p>
                      <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
                        <span>{message.title}</span>
                        <span>{message.received}</span>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 sm:flex-row sm:px-6">
          <Logo />
          <p className="font-mono text-xs text-muted-foreground">
            © {new Date().getFullYear()} Candor. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
