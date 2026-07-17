'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Flag, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { authFetch } from '@/lib/db/authFetch';

const MAX_CHARS = 280;

interface Message {
  messageId: string;
  senderId: string;
  text: string;
  sentAt: string;
  isOwn: boolean;
}

interface ChatClientProps {
  memberId: string;
  partnershipId: string;
  partnerCodename: string;
  initialMessages: Message[];
}

export function ChatClient({ memberId, partnershipId, partnerCodename, initialMessages }: ChatClientProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the newest confirmed (server-assigned) timestamp for incremental polling.
  const latestTs = () =>
    messages
      .filter(m => !m.messageId.startsWith('opt_'))
      .reduce<string | null>((acc, m) => (!acc || m.sentAt > acc ? m.sentAt : acc), null);

  // Poll for new messages from the partner every 4s.
  useEffect(() => {
    let active = true;
    const poll = async () => {
      const after = latestTs();
      const url = after
        ? `/api/chat?partnershipId=${partnershipId}&after=${encodeURIComponent(after)}`
        : `/api/chat?partnershipId=${partnershipId}`;
      try {
        const res = await authFetch(url);
        if (!res.ok || !active) return;
        const data = await res.json();
        const incoming: Message[] = data.messages ?? [];
        if (incoming.length === 0) return;
        setMessages(prev => {
          const seen = new Set(prev.map(m => m.messageId));
          const fresh = incoming.filter(m => !seen.has(m.messageId));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
      } catch { /* transient — next tick retries */ }
    };
    const id = setInterval(poll, 4000);
    return () => { active = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnershipId, messages]);

  // Scroll only the message list (never the page) when new messages arrive.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Let the on-screen keyboard OVERLAY the chat instead of resizing the
  // viewport (which shoves the whole UI upward). Supported in Chromium/Android;
  // browsers without it fall back to default behavior harmlessly.
  useEffect(() => {
    const vk = (navigator as unknown as { virtualKeyboard?: { overlaysContent: boolean } }).virtualKeyboard;
    if (vk) {
      vk.overlaysContent = true;
      return () => { vk.overlaysContent = false; };
    }
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || text.length > MAX_CHARS) return;

    setSending(true);
    setError('');
    const optimisticId = `opt_${Date.now()}`;
    const optimistic: Message = {
      messageId: optimisticId,
      senderId: memberId,
      text,
      sentAt: new Date().toISOString(),
      isOwn: true,
    };
    setMessages(prev => [...prev, optimistic]);
    setDraft('');

    try {
      const res = await authFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnershipId, text }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to send');
      }
      const { messageId, sentAt } = await res.json();
      setMessages(prev =>
        prev.map(m => m.messageId === optimisticId ? { ...m, messageId, sentAt } : m)
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed');
      setMessages(prev => prev.filter(m => m.messageId !== optimisticId));
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const charsLeft = MAX_CHARS - draft.length;

  return (
    <div
      className="flex flex-col h-[100dvh] overflow-hidden bg-stone-50 dark:bg-stone-950"
      style={{ paddingBottom: 'env(keyboard-inset-height, 0px)' }}
    >
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 flex-shrink-0">
        <Link href="/home" aria-label="Back">
          <ArrowLeft className="w-5 h-5 text-stone-400 hover:text-stone-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-stone-800 dark:text-stone-200 font-mono text-sm truncate">
            {partnerCodename}
          </p>
          <p className="text-xs text-stone-400">Your accountability partner</p>
        </div>
        <Link href={`/report?targetCodename=${encodeURIComponent(partnerCodename)}`} aria-label="Report">
          <Flag className="w-4 h-4 text-stone-300 hover:text-red-400 transition-colors" />
        </Link>
      </header>

      {/* Images disabled notice */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2 text-xs text-amber-700 dark:text-amber-400 text-center flex-shrink-0">
        Text only · Images are disabled · Messages are private and encrypted
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-stone-400 text-sm py-12">
            <p>Say hello to {partnerCodename}.</p>
            <p className="mt-1 text-xs">Messages are only visible to the two of you.</p>
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.messageId} message={msg} />
        ))}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 px-4 py-3">
        {error && <p className="text-red-600 text-xs mb-2">{error}</p>}
        <form onSubmit={handleSend} className="flex gap-2 items-end">
          <div className="flex-1">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as unknown as React.FormEvent); }
              }}
              placeholder="Type a message…"
              maxLength={MAX_CHARS}
              rows={1}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
            {charsLeft <= 40 && (
              <p className={`text-xs mt-1 text-right ${charsLeft < 0 ? 'text-red-500' : 'text-stone-400'}`}>
                {charsLeft}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={!draft.trim() || draft.length > MAX_CHARS || sending}
            className="w-10 h-10 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-stone-200 dark:disabled:bg-stone-700 flex items-center justify-center transition-colors flex-shrink-0"
            aria-label="Send message"
          >
            <Send className="w-4 h-4 text-white disabled:text-stone-400" />
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const time = new Date(message.sentAt).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });

  return (
    <div className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] space-y-1 ${message.isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
          message.isOwn
            ? 'bg-teal-600 text-white rounded-br-md'
            : 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-bl-md'
        }`}>
          {message.text}
        </div>
        <p className="text-xs text-stone-400 px-1">{time}</p>
      </div>
    </div>
  );
}
