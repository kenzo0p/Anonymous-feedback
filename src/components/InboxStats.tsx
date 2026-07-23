"use client";
import { useEffect, useState } from "react";
import axios from "axios";

type Stats = {
  total: number;
  today: number;
  last7: number;
  daily: { date: string; count: number }[];
};

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-2xl font-bold tracking-tight tabular-nums">{value}</div>
      <div className="eyebrow mt-1">{label}</div>
    </div>
  );
}

export default function InboxStats({ refreshKey }: { refreshKey?: number }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let active = true;
    axios
      .get<Stats>("/api/stats")
      .then((res) => {
        if (active) setStats(res.data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const max = stats ? Math.max(1, ...stats.daily.map((d) => d.count)) : 1;

  return (
    <div className="rounded-xl border border-border p-6">
      <h2 className="text-sm font-semibold">Overview</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Your messages over the last 14 days.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Tile label="Total" value={stats?.total ?? 0} />
        <Tile label="Last 7 days" value={stats?.last7 ?? 0} />
        <Tile label="Today" value={stats?.today ?? 0} />
      </div>

      <div className="mt-5 flex h-16 items-end gap-1" aria-hidden="true">
        {(stats?.daily ?? Array.from({ length: 14 }, () => ({ date: "", count: 0 }))).map(
          (d, i) => (
            <div
              key={d.date || i}
              title={d.date ? `${d.date}: ${d.count}` : undefined}
              className="flex-1 rounded-sm bg-foreground/80 transition-[height]"
              style={{
                height: `${Math.max(6, Math.round((d.count / max) * 100))}%`,
              }}
            />
          )
        )}
      </div>
      {stats && (
        <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>{stats.daily[0]?.date.slice(5)}</span>
          <span>{stats.daily[stats.daily.length - 1]?.date.slice(5)}</span>
        </div>
      )}
    </div>
  );
}
