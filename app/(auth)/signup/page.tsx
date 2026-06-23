'use client';

import { useState } from 'react';
import { AgeGate } from '@/app/components/AgeGate';
import { ConsentFlow } from '@/app/components/ConsentFlow';
import { PhoneSignup } from '@/app/components/PhoneSignup';

type Step = 'age-gate' | 'consent' | 'phone';

export default function SignupPage() {
  const [step, setStep] = useState<Step>('age-gate');

  return (
    <>
      {step === 'age-gate' && (
        <AgeGate onConfirmed={() => setStep('consent')} />
      )}
      {step === 'consent' && (
        <ConsentFlow onComplete={() => setStep('phone')} />
      )}
      {step === 'phone' && (
        <PhoneSignup />
      )}
    </>
  );
}
