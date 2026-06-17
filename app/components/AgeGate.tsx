'use client';

import { useState } from 'react';

interface AgeGateProps {
  onConfirmed: () => void;
}

export function AgeGate({ onConfirmed }: AgeGateProps) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 dark:bg-stone-950 p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-semibold text-stone-900 dark:text-stone-100" style={{ fontFamily: 'Spectral, serif' }}>
            Before you continue
          </h1>
          <p className="text-stone-600 dark:text-stone-400 text-base leading-relaxed">
            Onward is only for adults. We need to confirm your age before you can join.
          </p>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 shadow-sm border border-stone-200 dark:border-stone-800 space-y-6">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-stone-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
              aria-describedby="age-confirm-desc"
            />
            <span id="age-confirm-desc" className="text-stone-700 dark:text-stone-300 text-sm leading-relaxed">
              I confirm that I am <strong>18 years of age or older</strong> and that I have the legal
              right to access this service in my jurisdiction.
            </span>
          </label>

          <button
            onClick={onConfirmed}
            disabled={!checked}
            aria-disabled={!checked}
            className="w-full py-3 px-6 rounded-xl font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            Continue
          </button>
        </div>

        <p className="text-center text-xs text-stone-400 dark:text-stone-600">
          Age verification is required by law for this type of service.
          {/* HUMAN-OWNED: Link to Privacy Policy once finalized */}
        </p>
      </div>
    </div>
  );
}
