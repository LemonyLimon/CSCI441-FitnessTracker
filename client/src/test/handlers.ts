import { http, HttpResponse } from 'msw';

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

const nowIso = () => new Date().toISOString();

let currentToken = 'mock-token';
let currentUser: User = {
  userId: 1,
  email: null,
  displayName: 'Guest Test',
  isGuest: true,
  uiHighContrast: false,
  uiTextSize: 'normal',
  height: null,
  paymentInfo: null,
  hasPassword: false,
  createdAt: nowIso(),
  updatedAt: nowIso(),
};
let nextExerciseId = 3;
let exercises: Exercise[] = [
  {
    exerciseTypeId: 1,
    userId: null,
    isCustom: false,
    name: 'Bench Press',
    category: 'resistance',
    createdAt: nowIso(),
  },
  {
    exerciseTypeId: 2,
    userId: null,
    isCustom: false,
    name: 'Back Squat',
    category: 'resistance',
    createdAt: nowIso(),
  },
];
let nextWorkoutId = 2;
let workouts: Workout[] = [
  {
    workoutId: 1,
    userId: 1,
    title: 'Starter workout',
    notes: 'Seed workout',
    exerciseTypeId: 1,
    startedAt: nowIso(),
    endedAt: null,
    durationMinutes: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    userWeight: '100',
    reps: 10,
  },
];

export function resetApiMockState() {
  currentToken = 'mock-token';
  currentUser = {
    userId: 1,
    email: null,
    displayName: 'Guest Test',
    isGuest: true,
    uiHighContrast: false,
    uiTextSize: 'normal',
    height: null,
    paymentInfo: null,
    hasPassword: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  nextExerciseId = 3;
  exercises = [
    {
      exerciseTypeId: 1,
      userId: null,
      isCustom: false,
      name: 'Bench Press',
      category: 'resistance',
      createdAt: nowIso(),
    },
    {
      exerciseTypeId: 2,
      userId: null,
      isCustom: false,
      name: 'Back Squat',
      category: 'resistance',
      createdAt: nowIso(),
    },
  ];
  nextWorkoutId = 2;
  workouts = [
    {
      workoutId: 1,
      userId: 1,
      title: 'Starter workout',
      notes: 'Seed workout',
      exerciseTypeId: 1,
      startedAt: nowIso(),
      endedAt: null,
      durationMinutes: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      userWeight: '100',
      reps: 10,
    },
  ];
}

export const handlers = [
  http.get('/api/auth/options', () => {
    return HttpResponse.json({
      data: { oidc: false, demo: true },
      meta: {},
    });
  }),
  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ data: { ok: true }, meta: {} });
  }),
  http.post('/api/auth/guest', () => {
    currentToken = 'guest-token';
    currentUser = {
      userId: 1,
      email: null,
      displayName: 'Guest Test',
      isGuest: true,
      uiHighContrast: false,
      uiTextSize: 'normal',
      height: null,
      paymentInfo: null,
      hasPassword: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    return HttpResponse.json({
      data: { token: currentToken, user: currentUser },
    });
  }),
  http.post('/api/auth/sign-in', async ({ request }: { request: Request }) => {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };
    if (body.email !== 'user@example.com' || body.password !== 'password123') {
      return HttpResponse.json(
        {
          error: { code: 'client_error', message: 'invalid email or password' },
        },
        { status: 401 },
      );
    }
    currentToken = 'user-token';
    currentUser = {
      userId: 2,
      email: 'user@example.com',
      displayName: 'Demo User',
      isGuest: false,
      uiHighContrast: false,
      uiTextSize: 'normal',
      height: null,
      paymentInfo: null,
      hasPassword: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    return HttpResponse.json({
      data: { token: currentToken, user: currentUser },
    });
  }),
  http.get('/api/me', ({ request }: { request: Request }) => {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return HttpResponse.json(
        { error: { code: 'invalid_token', message: 'invalid access token' } },
        { status: 401 },
      );
    }
    return HttpResponse.json({ data: currentUser });
  }),
  http.patch(
    '/api/me/preferences',
    async ({ request }: { request: Request }) => {
      const body = (await request.json()) as {
        uiHighContrast?: boolean;
        uiTextSize?: string;
      };
      currentUser = {
        ...currentUser,
        uiHighContrast: body.uiHighContrast ?? currentUser.uiHighContrast,
        uiTextSize: body.uiTextSize ?? currentUser.uiTextSize,
      };
      return HttpResponse.json({ data: currentUser });
    },
  ),
  http.get('/api/exercise-types', () => {
    return HttpResponse.json({ data: exercises });
  }),
  http.post(
    '/api/exercise-types',
    async ({ request }: { request: Request }) => {
      const body = (await request.json()) as { name?: string };
      if (!body.name?.trim()) {
        return HttpResponse.json(
          {
            error: {
              code: 'validation_error',
              message: 'request validation failed',
            },
          },
          { status: 400 },
        );
      }
      const created: Exercise = {
        exerciseTypeId: nextExerciseId++,
        userId: currentUser.userId,
        isCustom: true,
        name: body.name.trim(),
        category: 'resistance',
        createdAt: nowIso(),
      };
      exercises = [...exercises, created];
      return HttpResponse.json({ data: created }, { status: 201 });
    },
  ),
  http.patch(
    '/api/exercise-types/:exerciseTypeId',
    async ({ params, request }: any) => {
      const exerciseTypeId = Number(params.exerciseTypeId);
      const body = (await request.json()) as { name?: string };
      exercises = exercises.map((exercise) =>
        exercise.exerciseTypeId === exerciseTypeId
          ? { ...exercise, name: body.name ?? exercise.name }
          : exercise,
      );
      const found = exercises.find(
        (item) => item.exerciseTypeId === exerciseTypeId,
      );
      return HttpResponse.json({ data: found });
    },
  ),
  http.delete('/api/exercise-types/:exerciseTypeId', ({ params }: any) => {
    const exerciseTypeId = Number(params.exerciseTypeId);
    exercises = exercises.filter(
      (exercise) => exercise.exerciseTypeId !== exerciseTypeId,
    );
    return new HttpResponse(null, { status: 204 });
  }),
  http.get('/api/workouts', () => {
    return HttpResponse.json({ data: workouts });
  }),
  http.post('/api/workouts', async ({ request }: { request: Request }) => {
    const body = (await request.json()) as {
      title?: string;
      notes?: string | null;
      exerciseTypeId?: number | null;
      userWeight?: number;
      reps?: number;
    };
    const created: Workout = {
      workoutId: nextWorkoutId++,
      userId: currentUser.userId,
      title: body.title ?? 'Untitled',
      notes: body.notes ?? null,
      exerciseTypeId: body.exerciseTypeId ?? null,
      startedAt: nowIso(),
      endedAt: null,
      durationMinutes: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      userWeight:
        body.userWeight !== undefined ? String(body.userWeight) : null,
      reps: body.reps ?? null,
    };
    workouts = [created, ...workouts];
    return HttpResponse.json({ data: created }, { status: 201 });
  }),
  http.patch('/api/workouts/:workoutId', async ({ params, request }: any) => {
    const workoutId = Number(params.workoutId);
    const body = (await request.json()) as {
      title?: string;
      notes?: string | null;
      exerciseTypeId?: number | null;
      userWeight?: number;
      reps?: number;
    };
    workouts = workouts.map((workout) =>
      workout.workoutId === workoutId
        ? {
            ...workout,
            title: body.title ?? workout.title,
            notes: body.notes ?? workout.notes,
            exerciseTypeId:
              body.exerciseTypeId === undefined
                ? workout.exerciseTypeId
                : body.exerciseTypeId,
            userWeight:
              body.userWeight !== undefined
                ? String(body.userWeight)
                : workout.userWeight,
            reps: body.reps !== undefined ? body.reps : workout.reps,
            updatedAt: nowIso(),
          }
        : workout,
    );
    const found = workouts.find((item) => item.workoutId === workoutId);
    return HttpResponse.json({ data: found });
  }),
  http.delete('/api/workouts/:workoutId', ({ params }: any) => {
    const workoutId = Number(params.workoutId);
    workouts = workouts.filter((workout) => workout.workoutId !== workoutId);
    return new HttpResponse(null, { status: 204 });
  }),
];
