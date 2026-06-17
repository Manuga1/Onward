export default function UnavailablePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 dark:bg-stone-950 p-6 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Not available in your region
        </h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed">
          Onward is currently available in the United States only. We hope to expand in the future.
        </p>
        <p className="text-xs text-stone-400">
          If you believe this is an error, please contact us.
        </p>
      </div>
    </div>
  );
}
