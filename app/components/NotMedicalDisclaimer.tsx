'use client';

interface NotMedicalDisclaimerProps {
  variant?: 'banner' | 'full';
}

export function NotMedicalDisclaimer({ variant = 'banner' }: NotMedicalDisclaimerProps) {
  if (variant === 'banner') {
    return (
      <div
        role="note"
        className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 text-sm text-amber-800 dark:text-amber-300"
      >
        <strong>Not medical advice.</strong> Onward is a peer accountability tool, not a substitute
        for medical or clinical treatment. If you are in crisis, please reach out to a professional.
      </div>
    );
  }

  return (
    <div
      role="note"
      className="space-y-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-5 text-sm text-amber-800 dark:text-amber-300"
    >
      <p className="font-semibold text-base">This is not medical or clinical treatment.</p>
      <p>
        Onward provides peer accountability support only. It is not a substitute for therapy,
        counseling, addiction treatment, or any medical or mental health service.
      </p>
      <p>
        If you are experiencing a mental health crisis or are in danger, please contact:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>
          <strong>988 Suicide & Crisis Lifeline:</strong> Call or text <strong>988</strong>
        </li>
        <li>
          <strong>Crisis Text Line:</strong> Text <strong>HOME</strong> to <strong>741741</strong>
        </li>
        <li>
          <strong>SAMHSA Helpline:</strong> 1-800-662-4357
        </li>
      </ul>
    </div>
  );
}
