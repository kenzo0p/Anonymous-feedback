import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import MessageModel from "@/model/Message.model";
import dbConnect from "@/lib/dbConnect";
import { User } from "next-auth";
import { ratelimit, tooManyRequests } from "@/lib/ratelimit";

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const _user: User = session?.user;
  if (!session || !_user?._id) {
    return Response.json(
      { success: false, message: "Not authenticated" },
      { status: 401 }
    );
  }

  const { success, reset } = await ratelimit.account.limit(_user._id);
  if (!success) return tooManyRequests(reset);

  await dbConnect();
  const format =
    new URL(request.url).searchParams.get("format") === "json" ? "json" : "csv";

  const messages = await MessageModel.find({ recipient: _user._id })
    .sort({ createdAt: -1 })
    .select("content createdAt")
    .lean();

  if (format === "json") {
    const body = JSON.stringify(
      messages.map((m) => ({ content: m.content, receivedAt: m.createdAt })),
      null,
      2
    );
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="whistr-messages.json"',
      },
    });
  }

  // CSV — prepend a BOM so spreadsheets read UTF-8 correctly.
  const rows = [
    ["Received", "Message"],
    ...messages.map((m) => [
      new Date(m.createdAt).toISOString(),
      String(m.content ?? ""),
    ]),
  ];
  const csv =
    "﻿" + rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="whistr-messages.csv"',
    },
  });
}
