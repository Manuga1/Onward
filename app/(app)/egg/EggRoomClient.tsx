'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Users, Clock, Heart, Check, Send, ArrowUp, ArrowDown } from 'lucide-react';

interface EggRoomClientProps {
  pod: Record<string, unknown> | null;
  podMembers: { memberId: string; codename: string }[];
  myMemberId: string;
  myCodename: string;
  existingPicks: string[]; // memberIds already submitted, in ranked order
}

export function EggRoomClient({ pod, podMembers, myMemberId, myCodename, existingPicks }: EggRoomClientProps) {
  if (!pod) {
    return <WaitingForPod />;
  }

  const endsAt = new Date(pod.ends_at as string);
  const daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 86400000));
  const others = podMembers.filter(m => m.memberId !== myMemberId);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 p-6">
      <div className="max-w-md mx-auto space-y-6">
        <header className="space-y-1">
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-sm font-medium">Your cohort</span>
          </div>
          <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">Your group</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm">
            Get to know each other. When the time&apos;s up, you&apos;ll each rank the group.
          </p>
        </header>

        {/* Countdown */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 flex items-center gap-3">
          <Clock className="text-stone-400 w-5 h-5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
              {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} to choose` : 'Matching soon'}
            </p>
            <p className="text-xs text-stone-400">Once the timer ends, you&apos;ll be matched with a partner</p>
          </div>
        </div>

        {/* Group chat */}
        <EggChat podId={pod.pod_id as string} myCodename={myCodename} />

        {/* Ranking */}
        <RankingSection
          others={others}
          podId={pod.pod_id as string}
          existingPicks={existingPicks}
        />

        {/* Not-medical disclaimer */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
          Onward is peer accountability support, not therapy or medical treatment.
        </div>

        {/* What to do */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 space-y-3">
          <h2 className="font-medium text-stone-800 dark:text-stone-200 flex items-center gap-2">
            <Heart className="w-4 h-4 text-teal-500" />
            What to do now
          </h2>
          <ul className="space-y-2 text-sm text-stone-600 dark:text-stone-400">
            <li>• Introduce yourself using your codename</li>
            <li>• Share what brought you here (as much as you&apos;re comfortable with)</li>
            <li>• Rank the people you connected with most</li>
            <li>• Your ranking is private — no one sees who you picked</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Group chat
// ============================================================
interface EggMessage {
  messageId: string;
  senderId: string;
  senderCodename: string;
  text: string;
  sentAt: string;
  isOwn: boolean;
}

function EggChat({ podId, myCodename }: { podId: string; myCodename: string }) {
  const [messages, setMessages] = useState<EggMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const lastSentAt = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const merge = useCallback((incoming: EggMessage[]) => {
    if (incoming.length === 0) return;
    setMessages(prev => {
      const seen = new Set(prev.map(m => m.messageId));
      const fresh = incoming.filter(m => !seen.has(m.messageId));
      if (fresh.length === 0) return prev;
      const next = [...prev, ...fresh];
      lastSentAt.current = next[next.length - 1].sentAt;
      return next;
    });
  }, []);

  const poll = useCallback(async () => {
    const url = lastSentAt.current
      ? `/api/egg/chat?podId=${podId}&after=${encodeURIComponent(lastSentAt.current)}`
      : `/api/egg/chat?podId=${podId}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      merge(data.messages ?? []);
    } catch { /* transient — next tick retries */ }
  }, [podId, merge]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, [poll]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');
    try {
      const res = await fetch('/api/egg/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ podId, text }),
      });
      if (res.ok) {
        await poll();
      } else {
        setDraft(text); // restore so the user doesn't lose it
      }
    } catch {
      setDraft(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800">
        <h2 className="text-sm font-medium text-stone-800 dark:text-stone-200">Group chat</h2>
        <p className="text-xs text-stone-400">You&apos;re {myCodename} · text only, everyone in the group can read this</p>
      </div>

      <div ref={scrollRef} className="h-64 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-stone-400 pt-8">
            No messages yet. Say hi 👋
          </p>
        ) : (
          messages.map(m => (
            <div key={m.messageId} className={`flex flex-col ${m.isOwn ? 'items-end' : 'items-start'}`}>
              {!m.isOwn && (
                <span className="text-[11px] font-mono text-stone-400 mb-0.5 px-1">{m.senderCodename}</span>
              )}
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                m.isOwn
                  ? 'bg-teal-600 text-white rounded-br-sm'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 rounded-bl-sm'
              }`}>
                {m.text}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={send} className="flex items-center gap-2 p-3 border-t border-stone-100 dark:border-stone-800">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          maxLength={280}
          placeholder="Message your group…"
          className="flex-1 px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          type="submit"
          disabled={sending || draft.trim().length === 0}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white flex-shrink-0 transition-colors"
          aria-label="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

// ============================================================
// Ranking
// ============================================================
function RankingSection({
  others,
  podId,
  existingPicks,
}: {
  others: { memberId: string; codename: string }[];
  podId: string;
  existingPicks: string[];
}) {
  // Order = ranked list. Seed from existing picks (in order), then append any
  // unranked members so everyone appears exactly once.
  const seed = (() => {
    const byId = new Map(others.map(m => [m.memberId, m]));
    const ordered = existingPicks.map(id => byId.get(id)).filter(Boolean) as typeof others;
    const remaining = others.filter(m => !existingPicks.includes(m.memberId));
    return [...ordered, ...remaining];
  })();

  const [ranked, setRanked] = useState(seed);
  const [saved, setSaved] = useState(existingPicks.length > 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function move(index: number, dir: -1 | 1) {
    if (saved) return;
    const target = index + dir;
    if (target < 0 || target >= ranked.length) return;
    setRanked(prev => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function submit() {
    if (ranked.length === 0) { setError('There is no one to rank yet.'); return; }
    setSaving(true);
    setError('');
    try {
      // Store top 3 in ranked order (matching engine reads this ordering).
      const picks = ranked.slice(0, 3).map(m => m.memberId);
      const res = await fetch('/api/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ podId, picks }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Could not save your ranking. Try again.');
      } else {
        setSaved(true);
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-2xl p-4 flex items-center gap-3">
        <Check className="w-5 h-5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-teal-700 dark:text-teal-300">Ranking submitted</p>
          <p className="text-xs text-teal-600 dark:text-teal-400">Private — only used for matching, never shared.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 space-y-3">
      <div>
        <h2 className="font-medium text-stone-800 dark:text-stone-200 text-sm">Rank your group</h2>
        <p className="text-xs text-stone-400 mt-0.5">
          Put the people you connected with most at the top. Use the arrows to reorder.
          This is completely private.
        </p>
      </div>
      <div className="space-y-2">
        {ranked.map((m, i) => (
          <div
            key={m.memberId}
            className="w-full rounded-xl px-3 py-3 border border-stone-200 dark:border-stone-800 flex items-center gap-3"
          >
            <div className="w-7 h-7 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              {i + 1}
            </div>
            <span className="font-mono text-sm text-stone-700 dark:text-stone-300 flex-1">{m.codename}</span>
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="w-6 h-6 flex items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30"
                aria-label={`Move ${m.codename} up`}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === ranked.length - 1}
                className="w-6 h-6 flex items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30"
                aria-label={`Move ${m.codename} down`}
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        onClick={submit}
        disabled={saving || ranked.length === 0}
        className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
      >
        {saving ? 'Saving…' : 'Submit ranking'}
      </button>
      <p className="text-center text-xs text-stone-400">
        You can reorder until matching runs.
      </p>
    </div>
  );
}

function WaitingForPod() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 dark:bg-stone-950 p-6 text-center">
      <div className="max-w-md space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center">
          <Users className="w-8 h-8 text-teal-600 dark:text-teal-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">You&apos;re on the list</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed">
            We open new cohorts regularly. We&apos;ll email you when your group is ready —
            usually within a few days.
          </p>
        </div>
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-4 text-sm text-stone-600 dark:text-stone-400 space-y-1">
          <p className="font-medium text-stone-800 dark:text-stone-200">What happens next</p>
          <p>We&apos;ll place you in a small group of 4–6 people.</p>
          <p>You&apos;ll have a few days to talk and rank the group.</p>
          <p>Matching is mutual — everyone chooses.</p>
        </div>
      </div>
    </div>
  );
}
