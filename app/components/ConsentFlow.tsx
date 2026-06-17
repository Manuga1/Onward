'use client';

import { useState } from 'react';
import { NotMedicalDisclaimer } from './NotMedicalDisclaimer';

interface ConsentFlowProps {
  onComplete: () => void;
}

type Step = 'disclaimer' | 'data' | 'terms';

export function ConsentFlow({ onComplete }: ConsentFlowProps) {
  const [step, setStep] = useState<Step>('disclaimer');
  const [accepted, setAccepted] = useState(false);

  const handleNext = () => {
    setAccepted(false);
    if (step === 'disclaimer') setStep('data');
    else if (step === 'data') setStep('terms');
    else onComplete();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 dark:bg-stone-950 p-6">
      <div className="max-w-md w-full space-y-6">
        <StepIndicator current={step} />

        {step === 'disclaimer' && (
          <DisclaimerStep accepted={accepted} onAccept={setAccepted} />
        )}
        {step === 'data' && (
          <DataStep accepted={accepted} onAccept={setAccepted} />
        )}
        {step === 'terms' && (
          <TermsStep accepted={accepted} onAccept={setAccepted} />
        )}

        <button
          onClick={handleNext}
          disabled={!accepted}
          className="w-full py-3 px-6 rounded-xl font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          {step === 'terms' ? 'I agree — let me in' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const steps: Step[] = ['disclaimer', 'data', 'terms'];
  const idx = steps.indexOf(current);
  return (
    <div className="flex gap-2 justify-center" aria-label="Progress">
      {steps.map((s, i) => (
        <div
          key={s}
          className={`h-1.5 flex-1 rounded-full ${i <= idx ? 'bg-teal-500' : 'bg-stone-200 dark:bg-stone-700'}`}
        />
      ))}
    </div>
  );
}

function DisclaimerStep({ accepted, onAccept }: { accepted: boolean; onAccept: (v: boolean) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100" style={{ fontFamily: 'Spectral, serif' }}>
        A quick but important note
      </h2>
      <NotMedicalDisclaimer variant="full" />
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={accepted}
          onChange={e => onAccept(e.target.checked)}
          className="mt-1 h-5 w-5 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
        />
        <span className="text-stone-700 dark:text-stone-300 text-sm leading-relaxed">
          I understand that Onward is peer support, not therapy or medical treatment.
        </span>
      </label>
    </div>
  );
}

function DataStep({ accepted, onAccept }: { accepted: boolean; onAccept: (v: boolean) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100" style={{ fontFamily: 'Spectral, serif' }}>
        Your privacy matters
      </h2>
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800">
        {[
          { icon: '🔒', title: 'Anonymous by design', desc: 'We only know you by a randomly assigned codename. No real names, ever.' },
          { icon: '📦', title: 'Minimal data', desc: 'We collect only what\'s needed: your phone number (encrypted), timezone, and check-in states.' },
          { icon: '🗑️', title: 'Your data, your choice', desc: 'Delete your account at any time. We honor all requests within 24 hours.' },
          { icon: '🚫', title: 'No selling, no ads', desc: 'Your recovery data is never sold or used for advertising — ever.' },
        ].map(item => (
          <div key={item.title} className="flex gap-3 p-4">
            <span className="text-xl">{item.icon}</span>
            <div>
              <p className="font-medium text-stone-800 dark:text-stone-200 text-sm">{item.title}</p>
              <p className="text-stone-500 dark:text-stone-400 text-xs mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={accepted}
          onChange={e => onAccept(e.target.checked)}
          className="mt-1 h-5 w-5 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
        />
        <span className="text-stone-700 dark:text-stone-300 text-sm leading-relaxed">
          I understand how Onward handles my data.
        </span>
      </label>
    </div>
  );
}

function TermsStep({ accepted, onAccept }: { accepted: boolean; onAccept: (v: boolean) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100" style={{ fontFamily: 'Spectral, serif' }}>
        Terms & Community Standards
      </h2>
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 space-y-3 text-sm text-stone-600 dark:text-stone-400">
        {/* HUMAN-OWNED: Link to finalized Terms of Service and Privacy Policy */}
        <p className="text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2 text-xs">
          ⚠️ Final Terms of Service and Privacy Policy are pending legal review.{' '}
          {/* HUMAN-OWNED: Replace with real links once policy text is approved */}
          <span className="underline cursor-not-allowed">Terms of Service</span> ·{' '}
          <span className="underline cursor-not-allowed">Privacy Policy</span>
        </p>
        <ul className="space-y-2 list-disc list-inside">
          <li>I am 18 or older and legally permitted to use this service.</li>
          <li>I will treat my accountability partner with respect.</li>
          <li>I will not share inappropriate content or images.</li>
          <li>I understand this is a US-based service and I am accessing it from the US.</li>
          <li>I will not use this service to harass, threaten, or exploit others.</li>
        </ul>
      </div>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={accepted}
          onChange={e => onAccept(e.target.checked)}
          className="mt-1 h-5 w-5 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
        />
        <span className="text-stone-700 dark:text-stone-300 text-sm leading-relaxed">
          I agree to the community standards and terms above.
        </span>
      </label>
    </div>
  );
}
