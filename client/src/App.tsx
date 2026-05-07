import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { EmptyWorkoutState } from '@/components/EmptyWorkoutState';
import { PreferencesCard } from '@/components/PreferencesCard';
import { resolveApiInput } from '@/lib/api-base-url';
import { getApiErrorMessage } from '@/lib/api-error';
import { TOKEN_STORAGE_KEY } from '@/lib/oidc-fragment';
import {
  ROOT_FONT_SIZE_PERCENT,
  apiTextSizeFromUi,
  normalizeUiTextSize,
  readStoredTheme,
  themeIsHighContrast,
  writeStoredTheme,
  type UiThemeId,
  type UiTextSizeId,
} from '@/lib/ui-preferences';
import {
  type ApiErrorEnvelope,
  type ApiSuccessEnvelope,
  type AuthOptionsResponse,
} from '@shared/api-contracts';

type User = {
  userId: number;
  email: string | null;
  displayName: string;
  isGuest: boolean;
  uiHighContrast: boolean;
  uiTextSize: string;
  height: number | null;
  paymentInfo: string | null;
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
};

type Exercise = {
  exerciseTypeId: number;
  userId: number | null;
  isCustom: boolean;
  name: string;
  muscleGroup: string | null;
  category: string;
  createdAt: string;
};

type Workout = {
  workoutId: number;
  userId: number;
  title: string;
  notes: string | null;
  exerciseTypeId: number | null;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  createdAt: string;
  updatedAt: string;
  userWeight: string | null;
  reps: number | null;
};

/** Fetch helper that enforces JSON envelope handling for API calls. */
async function fetchJson<T>(
  input: RequestInfo,
  init?: RequestInit,
  token?: string | null,
): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(resolveApiInput(input), {
    ...init,
    credentials: init?.credentials ?? 'include',
    headers,
  });
  if (!response.ok) {
    const errorBody = (await response
      .json()
      .catch(() => null)) as ApiErrorEnvelope | null;
    throw new Error(getApiErrorMessage(response.status, errorBody));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const envelope = (await response.json()) as ApiSuccessEnvelope<T>;
  return envelope.data;
}

/** Convert ISO timestamp to local input-friendly datetime text. */
function toLocalDateTime(isoValue: string): string {
  const date = new Date(isoValue);
  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offset * 60000);
  return adjusted.toISOString().slice(0, 16);
}

function isValidPositiveWeight(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0;
}

function isValidPositiveReps(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 && Number.isInteger(n);
}

export default function App() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_STORAGE_KEY),
  );
  const [authOptions, setAuthOptions] = useState<AuthOptionsResponse | null>(
    null,
  );
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('user@example.com');
  const [password, setPassword] = useState('password123');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(
    null,
  );
  const [editingExerciseName, setEditingExerciseName] = useState('');

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [workoutWeight, setWorkoutWeight] = useState('');
  const [workoutReps, setWorkoutReps] = useState('');
  const [workoutWeightError, setWorkoutWeightError] = useState('');
  const [workoutRepsError, setWorkoutRepsError] = useState('');
  const [exerciseTypeId, setExerciseTypeId] = useState<number | null>(null);
  const [editingWorkoutId, setEditingWorkoutId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editExerciseTypeId, setEditExerciseTypeId] = useState<number | null>(
    null,
  );
  const [editWorkoutWeight, setEditWorkoutWeight] = useState('');
  const [editWorkoutReps, setEditWorkoutReps] = useState('');
  const [workoutSaveToastAt, setWorkoutSaveToastAt] = useState<number | null>(
    null,
  );
  const [uiTheme, setUiTheme] = useState<UiThemeId>('standard');

  const workoutTitleInputRef = useRef<HTMLInputElement>(null);

  const resolvedTextSize: UiTextSizeId = user
    ? normalizeUiTextSize(user.uiTextSize)
    : 'standard';

  async function loadMe(currentToken: string): Promise<User> {
    return fetchJson<User>('/api/me', undefined, currentToken);
  }

  async function loadExercises(currentToken: string): Promise<Exercise[]> {
    return fetchJson<Exercise[]>(
      '/api/exercise-types',
      undefined,
      currentToken,
    );
  }

  async function loadWorkouts(currentToken: string): Promise<Workout[]> {
    return fetchJson<Workout[]>('/api/workouts', undefined, currentToken);
  }

  /** Persist accessibility preferences and refresh local user state. */
  const updatePreferences = useCallback(
    async (input: {
      uiHighContrast?: boolean;
      uiTextSize?: string;
    }): Promise<void> => {
      if (!token) return;
      try {
        const updated = await fetchJson<User>(
          '/api/me/preferences',
          {
            method: 'PATCH',
            body: JSON.stringify(input),
          },
          token,
        );
        setUser(updated);
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'failed to update preferences',
        );
      }
    },
    [token],
  );

  // Hydrate authenticated state when a token exists.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        const [me, nextExercises, nextWorkouts] = await Promise.all([
          loadMe(token),
          loadExercises(token),
          loadWorkouts(token),
        ]);
        if (cancelled) return;
        setUser(me);
        setExercises(nextExercises);
        setWorkouts(nextWorkouts);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'failed to hydrate user';
        setErrorMessage(message);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
        setUser(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  /** Discover OIDC vs demo flows; public endpoint. */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const opts = await fetchJson<AuthOptionsResponse>('/api/auth/options');
        if (!cancelled) setAuthOptions(opts);
      } catch {
        if (!cancelled) setAuthOptions({ oidc: false, demo: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** OIDC error redirect query (?auth_error=). */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('auth_error');
    if (!code) return;
    const messages: Record<string, string> = {
      state_mismatch:
        'Sign-in could not be verified. Please try signing in again.',
      idp_error: 'Sign-in was cancelled or rejected by the identity provider.',
      state_expired: 'Sign-in session expired. Please try again.',
      internal: 'Could not complete sign-in. Please try again.',
    };
    queueMicrotask(() => {
      setErrorMessage(messages[code] ?? messages.internal);
    });
    params.delete('auth_error');
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`;
    window.history.replaceState(null, '', nextUrl);
  }, []);

  useEffect(() => {
    if (!user?.userId || !token) return;
    const stored = readStoredTheme(user.userId);
    const nextTheme = stored ?? 'standard';
    const { uiHighContrast } = user;
    queueMicrotask(() => {
      setUiTheme(nextTheme);
      if (themeIsHighContrast(nextTheme) === uiHighContrast) return;
      void updatePreferences({
        uiHighContrast: themeIsHighContrast(nextTheme),
      });
    });
  }, [user, token, updatePreferences]);

  useEffect(() => {
    const theme = user ? uiTheme : 'standard';
    document.documentElement.setAttribute('data-app-theme', theme);
    document.documentElement.style.fontSize = user
      ? ROOT_FONT_SIZE_PERCENT[resolvedTextSize]
      : '100%';
  }, [user, uiTheme, resolvedTextSize]);

  useEffect(() => {
    if (workoutSaveToastAt === null) return;
    const id = window.setTimeout(() => setWorkoutSaveToastAt(null), 3000);
    return () => clearTimeout(id);
  }, [workoutSaveToastAt]);

  const sortedExercises = useMemo(
    () => [...exercises].sort((a, b) => a.name.localeCompare(b.name)),
    [exercises],
  );

  /** One-click guest auth for demo mode. */
  async function loginAsGuest(): Promise<void> {
    try {
      setErrorMessage('');
      const session = await fetchJson<{ token: string; user: User }>(
        '/api/auth/guest',
        { method: 'POST' },
      );
      localStorage.setItem(TOKEN_STORAGE_KEY, session.token);
      setToken(session.token);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'guest login failed',
      );
    }
  }

  /** Full-page redirect to Auth0 (clears stored JWT first). */
  function startOidcLogin(): void {
    setErrorMessage('');
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setExercises([]);
    setWorkouts([]);
    window.location.href = resolveApiInput(
      '/api/auth/oidc/login?next=/',
    ) as string;
  }

  /** Email/password sign-in for seeded or registered users. */
  async function signIn(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    try {
      setErrorMessage('');
      const session = await fetchJson<{ token: string; user: User }>(
        '/api/auth/sign-in',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        },
      );
      localStorage.setItem(TOKEN_STORAGE_KEY, session.token);
      setToken(session.token);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'sign in failed');
    }
  }

  function handleThemeChange(next: UiThemeId): void {
    if (!user) return;
    setUiTheme(next);
    writeStoredTheme(user.userId, next);
    void updatePreferences({ uiHighContrast: themeIsHighContrast(next) });
  }

  function handleTextSizeChange(next: UiTextSizeId): void {
    void updatePreferences({ uiTextSize: apiTextSizeFromUi(next) });
  }

  /** Create a custom exercise row for the authenticated user. */
  async function addCustomExercise(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (!token || !newExerciseName.trim()) return;
    try {
      const created = await fetchJson<Exercise>(
        '/api/exercise-types',
        {
          method: 'POST',
          body: JSON.stringify({ name: newExerciseName.trim() }),
        },
        token,
      );
      setExercises((prev) => [...prev, created]);
      setNewExerciseName('');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'failed to create exercise',
      );
    }
  }

  /** Rename a custom exercise in-place. */
  async function saveExerciseName(exerciseTypeId: number): Promise<void> {
    if (!token || !editingExerciseName.trim()) return;
    try {
      const updated = await fetchJson<Exercise>(
        `/api/exercise-types/${exerciseTypeId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ name: editingExerciseName.trim() }),
        },
        token,
      );
      setExercises((prev) =>
        prev.map((item) =>
          item.exerciseTypeId === exerciseTypeId ? updated : item,
        ),
      );
      setEditingExerciseId(null);
      setEditingExerciseName('');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'failed to update exercise',
      );
    }
  }

  /** Delete one custom exercise by identifier. */
  async function deleteExercise(exerciseTypeId: number): Promise<void> {
    if (!token) return;
    try {
      await fetchJson<void>(
        `/api/exercise-types/${exerciseTypeId}`,
        {
          method: 'DELETE',
        },
        token,
      );
      setExercises((prev) =>
        prev.filter((item) => item.exerciseTypeId !== exerciseTypeId),
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'failed to delete exercise',
      );
    }
  }

  /** Create a workout from the form draft. */
  async function addWorkout(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!token) {
      setErrorMessage('Sign in to create a workout.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Add a workout title before creating.');
      return;
    }
    setErrorMessage('');

    let hasFieldError = false;
    if (!isValidPositiveWeight(workoutWeight)) {
      setWorkoutWeightError('Weight must be greater than 0.');
      hasFieldError = true;
    } else {
      setWorkoutWeightError('');
    }
    if (!isValidPositiveReps(workoutReps)) {
      setWorkoutRepsError('Reps must be greater than 0.');
      hasFieldError = true;
    } else {
      setWorkoutRepsError('');
    }
    if (hasFieldError) return;

    try {
      const created = await fetchJson<Workout>(
        '/api/workouts',
        {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            notes: notes.trim() || null,
            exerciseTypeId,
            userWeight: Number(workoutWeight.trim()),
            reps: Number(workoutReps.trim()),
          }),
        },
        token,
      );
      setWorkouts((prev) => [created, ...prev]);
      setTitle('');
      setNotes('');
      setWorkoutWeight('');
      setWorkoutReps('');
      setWorkoutWeightError('');
      setWorkoutRepsError('');
      setExerciseTypeId(null);
      setWorkoutSaveToastAt(Date.now());
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'failed to create workout',
      );
    }
  }

  /** Save edits for a selected workout card. */
  async function saveWorkout(workoutId: number): Promise<void> {
    if (!token || !editTitle.trim()) return;
    if (!isValidPositiveWeight(editWorkoutWeight)) {
      setErrorMessage('Weight must be greater than 0.');
      return;
    }
    if (!isValidPositiveReps(editWorkoutReps)) {
      setErrorMessage('Reps must be greater than 0.');
      return;
    }
    setErrorMessage('');
    try {
      const updated = await fetchJson<Workout>(
        `/api/workouts/${workoutId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            title: editTitle.trim(),
            notes: editNotes.trim() || null,
            exerciseTypeId: editExerciseTypeId,
            userWeight: Number(editWorkoutWeight.trim()),
            reps: Number(editWorkoutReps.trim()),
          }),
        },
        token,
      );
      setWorkouts((prev) =>
        prev.map((item) => (item.workoutId === workoutId ? updated : item)),
      );
      setEditingWorkoutId(null);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'failed to update workout',
      );
    }
  }

  /** Delete one workout and remove it from local list state. */
  async function deleteWorkoutById(workoutId: number): Promise<void> {
    if (!token) return;
    try {
      await fetchJson<void>(
        `/api/workouts/${workoutId}`,
        {
          method: 'DELETE',
        },
        token,
      );
      setWorkouts((prev) =>
        prev.filter((item) => item.workoutId !== workoutId),
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'failed to delete workout',
      );
    }
  }

  /** Clear server session cookie and local JWT. */
  async function logout(): Promise<void> {
    try {
      await fetch(resolveApiInput('/api/auth/logout') as string, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      /* best-effort */
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setExercises([]);
    setWorkouts([]);
    setWorkoutSaveToastAt(null);
  }

  return (
    <main className="min-h-screen min-w-0 bg-[color:var(--app-bg)] px-4 py-6 text-[color:var(--app-fg)] sm:px-6 sm:py-8">
      {user && workoutSaveToastAt !== null ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-[color:var(--app-success-border)] bg-[color:var(--app-success-bg)] px-4 py-3 text-[color:var(--app-success-fg)] shadow-lg">
          <p className="font-medium">Success</p>
          <p className="mt-0.5">Workout saved to your history!</p>
        </div>
      ) : null}
      <div className="mx-auto min-w-0 w-full max-w-4xl space-y-6">
        <header className="min-w-0 space-y-2">
          <h1 className="text-2xl font-medium text-[color:var(--app-fg)]">
            Workout Tracker Mini
          </h1>
          <p className="text-[color:var(--app-fg-muted)]">
            Minimal demo: JWT auth, workouts CRUD, custom exercises, and basic
            accessibility.
          </p>
        </header>

        {errorMessage ? (
          <p
            role="alert"
            className="rounded-lg border border-[color:var(--app-field-error)] bg-[color:var(--app-field-error-bg)] p-3 text-[color:var(--app-field-error)]">
            {errorMessage}
          </p>
        ) : null}

        {!user ? (
          <section className="space-y-4 rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-4 sm:p-6">
            <h2 className="text-xl font-medium text-[color:var(--app-fg)]">
              Sign in
            </h2>
            {authOptions === null ? (
              <p className="text-[color:var(--app-fg-muted)]">
                Loading sign-in options…
              </p>
            ) : (
              <>
                {authOptions.demo ? (
                  <form className="flex flex-col gap-3" onSubmit={signIn}>
                    <label className="flex flex-col gap-1">
                      <span className="text-[color:var(--app-fg)]">Email</span>
                      <input
                        className="rounded-lg border border-[color:var(--app-input-border)] bg-[color:var(--app-input-bg)] px-3 py-2 text-[color:var(--app-input-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)]"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[color:var(--app-fg)]">
                        Password
                      </span>
                      <input
                        className="rounded-lg border border-[color:var(--app-input-border)] bg-[color:var(--app-input-bg)] px-3 py-2 text-[color:var(--app-input-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)]"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <button
                        className="rounded-lg bg-[color:var(--app-accent)] px-4 py-2 font-medium text-[color:var(--app-accent-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-surface)]"
                        type="submit">
                        Sign in
                      </button>
                      <button
                        className="rounded-lg bg-[color:var(--app-secondary-bg)] px-4 py-2 font-medium text-[color:var(--app-secondary-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-surface)]"
                        type="button"
                        onClick={loginAsGuest}>
                        Continue as guest
                      </button>
                    </div>
                  </form>
                ) : null}
                {authOptions.oidc ? (
                  <div>
                    <button
                      className="rounded-lg border border-[color:var(--app-border)] px-4 py-2 font-medium text-[color:var(--app-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-surface)]"
                      type="button"
                      onClick={startOidcLogin}>
                      Continue with Auth0
                    </button>
                  </div>
                ) : null}
                {!authOptions.demo && !authOptions.oidc ? (
                  <p className="text-[color:var(--app-fg-muted)]">
                    No sign-in methods are enabled for this deployment.
                  </p>
                ) : null}
                {authOptions.demo ? (
                  <p className="text-sm text-[color:var(--app-fg-muted)]">
                    Demo seeded user:{' '}
                    <code>user@example.com / password123</code>
                  </p>
                ) : null}
              </>
            )}
          </section>
        ) : (
          <>
            <section className="min-w-0 space-y-4 rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-4 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-medium text-[color:var(--app-fg)]">
                  {user.displayName} {user.isGuest ? '(Guest)' : ''}
                </h2>
                <button
                  type="button"
                  className="self-start rounded-lg border border-[color:var(--app-border)] px-3 py-2 font-medium text-[color:var(--app-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-surface)] sm:self-auto"
                  onClick={logout}>
                  Log out
                </button>
              </div>
              <PreferencesCard
                theme={uiTheme}
                textSize={resolvedTextSize}
                onThemeChange={handleThemeChange}
                onTextSizeChange={handleTextSizeChange}
              />
            </section>

            <section className="min-w-0 space-y-4 rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-4 sm:p-6">
              <h2 className="text-xl font-medium text-[color:var(--app-fg)]">
                Exercises
              </h2>
              <form
                className="flex min-w-0 flex-col gap-2 sm:flex-row"
                onSubmit={addCustomExercise}>
                <input
                  className="min-w-0 flex-1 rounded-lg border border-[color:var(--app-input-border)] bg-[color:var(--app-input-bg)] px-3 py-2 text-[color:var(--app-input-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)]"
                  placeholder="New custom exercise"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                />
                <button
                  className="rounded-lg bg-[color:var(--app-accent)] px-3 py-2 font-medium text-[color:var(--app-accent-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-surface)]"
                  type="submit">
                  Add
                </button>
              </form>
              <ul className="space-y-2">
                {sortedExercises.map((exercise) => (
                  <li
                    className="flex min-w-0 flex-col gap-2 rounded-lg border border-[color:var(--app-border)] p-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                    key={exercise.exerciseTypeId}>
                    <div className="min-w-0">
                      <strong className="text-[color:var(--app-fg)]">
                        {exercise.name}
                      </strong>{' '}
                      <span className="text-[color:var(--app-fg-muted)]">
                        ({exercise.isCustom ? 'custom' : 'seed'})
                      </span>
                    </div>
                    {exercise.isCustom ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {editingExerciseId === exercise.exerciseTypeId ? (
                          <>
                            <input
                              aria-label="Exercise name"
                              className="min-w-0 flex-1 rounded-lg border border-[color:var(--app-input-border)] bg-[color:var(--app-input-bg)] px-2 py-1 text-[color:var(--app-input-fg)] sm:max-w-xs"
                              value={editingExerciseName}
                              onChange={(e) =>
                                setEditingExerciseName(e.target.value)
                              }
                            />
                            <button
                              type="button"
                              className="rounded-lg border border-[color:var(--app-border)] px-2 py-1 font-medium text-[color:var(--app-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)]"
                              onClick={() =>
                                saveExerciseName(exercise.exerciseTypeId)
                              }>
                              Save
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="rounded-lg border border-[color:var(--app-border)] px-2 py-1 font-medium text-[color:var(--app-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)]"
                            onClick={() => {
                              setEditingExerciseId(exercise.exerciseTypeId);
                              setEditingExerciseName(exercise.name);
                            }}>
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          className="rounded-lg border border-[color:var(--app-border)] px-2 py-1 font-medium text-[color:var(--app-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)]"
                          onClick={() =>
                            deleteExercise(exercise.exerciseTypeId)
                          }>
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>

            <section className="min-w-0 space-y-4 rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-4 sm:p-6">
              <h2 className="text-xl font-medium text-[color:var(--app-fg)]">
                Workouts
              </h2>
              <form className="min-w-0 space-y-2" onSubmit={addWorkout}>
                <label
                  className="flex flex-col gap-1"
                  htmlFor="add-workout-title">
                  <span className="text-[color:var(--app-fg)]">
                    Workout title
                  </span>
                  <input
                    id="add-workout-title"
                    ref={workoutTitleInputRef}
                    className="w-full min-w-0 rounded-lg border border-[color:var(--app-input-border)] bg-[color:var(--app-input-bg)] px-3 py-2 text-[color:var(--app-input-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)]"
                    placeholder="Workout title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
                <label
                  className="flex flex-col gap-1"
                  htmlFor="add-workout-notes">
                  <span className="text-[color:var(--app-fg)]">
                    Notes (optional)
                  </span>
                  <textarea
                    id="add-workout-notes"
                    className="w-full min-w-0 rounded-lg border border-[color:var(--app-input-border)] bg-[color:var(--app-input-bg)] px-3 py-2 text-[color:var(--app-input-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)]"
                    placeholder="Notes (optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
                <label
                  className="flex flex-col gap-1"
                  htmlFor="add-workout-exercise">
                  <span className="text-[color:var(--app-fg)]">Exercise</span>
                  <select
                    id="add-workout-exercise"
                    className="w-full min-w-0 rounded-lg border border-[color:var(--app-input-border)] bg-[color:var(--app-input-bg)] px-3 py-2 text-[color:var(--app-input-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)]"
                    value={exerciseTypeId ?? ''}
                    onChange={(e) =>
                      setExerciseTypeId(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }>
                    <option value="">No exercise linked</option>
                    {sortedExercises.map((exercise) => (
                      <option
                        key={exercise.exerciseTypeId}
                        value={exercise.exerciseTypeId}>
                        {exercise.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label
                  className="flex flex-col gap-1"
                  htmlFor="add-workout-weight">
                  <span className="text-[color:var(--app-fg)]">Weight</span>
                  <input
                    id="add-workout-weight"
                    className="w-full min-w-0 rounded-lg border border-[color:var(--app-input-border)] bg-[color:var(--app-input-bg)] px-3 py-2 text-[color:var(--app-input-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)]"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={workoutWeight}
                    onChange={(e) => {
                      setWorkoutWeight(e.target.value);
                      setWorkoutWeightError('');
                    }}
                    {...(workoutWeightError
                      ? ({
                          'aria-invalid': 'true',
                          'aria-describedby': 'add-workout-weight-error',
                        } as const)
                      : ({ 'aria-invalid': 'false' } as const))}
                  />
                </label>
                <div aria-live="assertive" aria-atomic="true">
                  {workoutWeightError ? (
                    <p
                      id="add-workout-weight-error"
                      className="text-sm font-medium text-[color:var(--app-field-error)]">
                      {workoutWeightError}
                    </p>
                  ) : null}
                </div>
                <label
                  className="flex flex-col gap-1"
                  htmlFor="add-workout-reps">
                  <span className="text-[color:var(--app-fg)]">Reps</span>
                  <input
                    id="add-workout-reps"
                    className="w-full min-w-0 rounded-lg border border-[color:var(--app-input-border)] bg-[color:var(--app-input-bg)] px-3 py-2 text-[color:var(--app-input-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)]"
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min="1"
                    value={workoutReps}
                    onChange={(e) => {
                      setWorkoutReps(e.target.value);
                      setWorkoutRepsError('');
                    }}
                    {...(workoutRepsError
                      ? ({
                          'aria-invalid': 'true',
                          'aria-describedby': 'add-workout-reps-error',
                        } as const)
                      : ({ 'aria-invalid': 'false' } as const))}
                  />
                </label>
                <div aria-live="assertive" aria-atomic="true">
                  {workoutRepsError ? (
                    <p
                      id="add-workout-reps-error"
                      className="text-sm font-medium text-[color:var(--app-field-error)]">
                      {workoutRepsError}
                    </p>
                  ) : null}
                </div>
                <button
                  className="rounded-lg bg-[color:var(--app-accent)] px-4 py-2 font-medium text-[color:var(--app-accent-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-surface)]"
                  type="submit">
                  Create workout
                </button>
              </form>

              {workouts.length === 0 ? (
                <EmptyWorkoutState
                  onLogFirstSession={() => {
                    workoutTitleInputRef.current?.focus();
                    workoutTitleInputRef.current?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                    });
                  }}
                />
              ) : (
                <ul className="space-y-3">
                  {workouts.map((workout) => {
                    const linkedExercise = exercises.find(
                      (item) => item.exerciseTypeId === workout.exerciseTypeId,
                    );
                    const isEditing = editingWorkoutId === workout.workoutId;
                    return (
                      <li
                        className="min-w-0 rounded-lg border border-[color:var(--app-border)] p-3"
                        key={workout.workoutId}>
                        {isEditing ? (
                          <div className="min-w-0 space-y-2">
                            <input
                              aria-label="Workout title"
                              className="w-full min-w-0 rounded-lg border border-[color:var(--app-input-border)] bg-[color:var(--app-input-bg)] px-3 py-2 text-[color:var(--app-input-fg)]"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                            />
                            <textarea
                              aria-label="Workout notes"
                              className="w-full min-w-0 rounded-lg border border-[color:var(--app-input-border)] bg-[color:var(--app-input-bg)] px-3 py-2 text-[color:var(--app-input-fg)]"
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                            />
                            <select
                              aria-label="Linked exercise"
                              className="w-full min-w-0 rounded-lg border border-[color:var(--app-input-border)] bg-[color:var(--app-input-bg)] px-3 py-2 text-[color:var(--app-input-fg)]"
                              value={editExerciseTypeId ?? ''}
                              onChange={(e) =>
                                setEditExerciseTypeId(
                                  e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                )
                              }>
                              <option value="">No exercise linked</option>
                              {sortedExercises.map((exercise) => (
                                <option
                                  key={exercise.exerciseTypeId}
                                  value={exercise.exerciseTypeId}>
                                  {exercise.name}
                                </option>
                              ))}
                            </select>
                            <label className="flex flex-col gap-1">
                              <span className="text-[color:var(--app-fg)]">
                                Weight
                              </span>
                              <input
                                aria-label="Edit workout weight"
                                className="w-full min-w-0 rounded-lg border border-[color:var(--app-input-border)] bg-[color:var(--app-input-bg)] px-3 py-2 text-[color:var(--app-input-fg)]"
                                type="number"
                                inputMode="decimal"
                                step="any"
                                value={editWorkoutWeight}
                                onChange={(e) =>
                                  setEditWorkoutWeight(e.target.value)
                                }
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-[color:var(--app-fg)]">
                                Reps
                              </span>
                              <input
                                aria-label="Edit workout reps"
                                className="w-full min-w-0 rounded-lg border border-[color:var(--app-input-border)] bg-[color:var(--app-input-bg)] px-3 py-2 text-[color:var(--app-input-fg)]"
                                type="number"
                                inputMode="numeric"
                                step="1"
                                min="1"
                                value={editWorkoutReps}
                                onChange={(e) =>
                                  setEditWorkoutReps(e.target.value)
                                }
                              />
                            </label>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="rounded-lg border border-[color:var(--app-border)] px-3 py-2 font-medium text-[color:var(--app-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)]"
                                onClick={() => saveWorkout(workout.workoutId)}>
                                Save
                              </button>
                              <button
                                type="button"
                                className="rounded-lg border border-[color:var(--app-border)] px-3 py-2 font-medium text-[color:var(--app-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)]"
                                onClick={() => setEditingWorkoutId(null)}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h3 className="text-lg font-medium text-[color:var(--app-fg)]">
                              {workout.title}
                            </h3>
                            {workout.notes ? (
                              <p className="text-[color:var(--app-fg)]">
                                {workout.notes}
                              </p>
                            ) : null}
                            <p className="text-sm text-[color:var(--app-fg-muted)]">
                              Started:{' '}
                              {toLocalDateTime(workout.startedAt).replace(
                                'T',
                                ' ',
                              )}
                            </p>
                            <p className="text-sm text-[color:var(--app-fg-muted)]">
                              Exercise: {linkedExercise?.name ?? 'None'}
                            </p>
                            {workout.userWeight != null &&
                            workout.reps != null ? (
                              <p className="text-sm text-[color:var(--app-fg-muted)]">
                                Weight: {workout.userWeight} · Reps:{' '}
                                {workout.reps}
                              </p>
                            ) : null}
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="rounded-lg border border-[color:var(--app-border)] px-3 py-2 font-medium text-[color:var(--app-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)]"
                                onClick={() => {
                                  setEditingWorkoutId(workout.workoutId);
                                  setEditTitle(workout.title);
                                  setEditNotes(workout.notes ?? '');
                                  setEditExerciseTypeId(workout.exerciseTypeId);
                                  setEditWorkoutWeight(
                                    workout.userWeight != null
                                      ? String(Number(workout.userWeight))
                                      : '',
                                  );
                                  setEditWorkoutReps(
                                    workout.reps != null
                                      ? String(workout.reps)
                                      : '',
                                  );
                                }}>
                                Edit
                              </button>
                              <button
                                type="button"
                                className="rounded-lg border border-[color:var(--app-border)] px-3 py-2 font-medium text-[color:var(--app-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)]"
                                onClick={() =>
                                  deleteWorkoutById(workout.workoutId)
                                }>
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
