'use client';

import { useState } from 'react';
import { Users, CheckCircle } from 'lucide-react';

interface PodMember {
  memberId: string;
  codename: string;
  intensity: string;
  stage: string;
  timezone: string;
  faith_preference?: string;
}

interface Pod {
  pod_id: string;
  fight: string;
  gender: string;
  ends_at: string;
  members: PodMember[];
}

interface OperatorMatchClientProps {
  pods: Pod[];
}

export function OperatorMatchClient({ pods }: OperatorMatchClientProps) {
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [results, setResults] = useState<Record<string, { ok: boolean; error?: string }>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const toggle = (podId: string, memberId: string) => {
    setSelections(s => {
      const current = s[podId] ?? [];
      if (current.includes(memberId)) {
        return { ...s, [podId]: current.filter(id => id !== memberId) };
      }
      return { ...s, [podId]: [...current, memberId] };
    });
  };

  const handleMatch = async (podId: string) => {
    const memberIds = selections[podId] ?? [];
    if (memberIds.length < 2) return;
    setLoading(l => ({ ...l, [podId]: true }));
    try {
      const res = await fetch('/api/operator/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberIds }),
      });
      const data = await res.json();
      setResults(r => ({ ...r, [podId]: res.ok ? { ok: true } : { ok: false, error: data.error } }));
    } catch {
      setResults(r => ({ ...r, [podId]: { ok: false, error: 'Network error' } }));
    } finally {
      setLoading(l => ({ ...l, [podId]: false }));
    }
  };

  if (pods.length === 0) {
    return (
      <div className="p-8 text-center text-stone-500">
        <Users className="w-10 h-10 mx-auto mb-3 text-stone-300" />
        <p>No pods with unmatched members.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <header>
          <h1 className="text-2xl font-semibold text-stone-900">Operator — Manual Matching</h1>
          <p className="text-stone-500 text-sm mt-1">
            Select 2–3 members to pair. This is the Phase 1 concierge matching interface.
          </p>
          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            ⚠️ HUMAN-OWNED: Secure this route before launch. No auth is enforced here in Phase 1.
          </div>
        </header>

        {pods.map(pod => {
          const sel = selections[pod.pod_id] ?? [];
          const result = results[pod.pod_id];
          const isLoading = loading[pod.pod_id];

          return (
            <div key={pod.pod_id} className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-stone-800">{pod.gender} · {pod.fight}</p>
                  <p className="text-xs text-stone-400">Ends {new Date(pod.ends_at).toLocaleDateString()}</p>
                </div>
                <span className="text-xs font-mono text-stone-400">{pod.pod_id.slice(0, 8)}</span>
              </div>

              <div className="space-y-2">
                {pod.members.map(m => (
                  <label key={m.memberId}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${
                      sel.includes(m.memberId)
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}>
                    <input type="checkbox" checked={sel.includes(m.memberId)}
                      onChange={() => toggle(pod.pod_id, m.memberId)} className="sr-only" />
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      sel.includes(m.memberId) ? 'border-teal-500 bg-teal-500' : 'border-stone-300'
                    }`}>
                      {sel.includes(m.memberId) && <span className="text-white text-xs">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-medium text-stone-800">{m.codename}</p>
                      <p className="text-xs text-stone-400">{m.intensity} · {m.stage} · {m.timezone}{m.faith_preference ? ` · ${m.faith_preference}` : ''}</p>
                    </div>
                  </label>
                ))}
              </div>

              {result?.ok ? (
                <div className="flex items-center gap-2 text-teal-700 bg-teal-50 rounded-xl px-4 py-3 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Partnership created successfully.
                </div>
              ) : (
                <div className="space-y-2">
                  {result?.error && <p className="text-red-600 text-sm">{result.error}</p>}
                  <button
                    onClick={() => handleMatch(pod.pod_id)}
                    disabled={sel.length < 2 || isLoading}
                    className="w-full py-2.5 rounded-xl font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed text-sm transition-colors"
                  >
                    {isLoading ? 'Creating…' : `Match ${sel.length} selected member${sel.length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
