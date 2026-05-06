type EmptyWorkoutStateProps = {
  /** Called when the user chooses to log their first session */
  onLogFirstSession: () => void;
};

function FitnessEmptyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 40"
      fill="currentColor"
      aria-hidden="true">
      <rect x="4" y="10" width="10" height="20" rx="2" />
      <rect x="50" y="10" width="10" height="20" rx="2" />
      <rect x="14" y="16" width="36" height="8" rx="2" />
    </svg>
  );
}

export function EmptyWorkoutState({
  onLogFirstSession,
}: EmptyWorkoutStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 py-10 text-center"
      role="status"
      aria-live="polite">
      <FitnessEmptyIcon className="h-16 w-16 text-[color:var(--app-fg-muted)]" />
      <p className="text-lg font-medium text-[color:var(--app-fg)]">
        No Workouts Recorded
      </p>
      <button
        type="button"
        className="rounded-lg bg-[color:var(--app-accent)] px-4 py-2 font-medium text-[color:var(--app-accent-fg)] hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-bg)]"
        onClick={onLogFirstSession}
        aria-label="Log your first workout session: move to the create workout form and focus the title field">
        Log Your First Session
      </button>
    </div>
  );
}
