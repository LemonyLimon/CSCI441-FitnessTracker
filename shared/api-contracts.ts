export type ApiErrorCode =
  | 'client_error'
  | 'validation_error'
  | 'invalid_token'
  | 'internal_error';

export type ApiMeta = {
  requestId?: string;
};

export type ApiSuccessEnvelope<T> = {
  data: T;
  meta?: ApiMeta;
};

export type ApiErrorBody = {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
};

export type ApiErrorEnvelope = {
  error: ApiErrorBody;
  meta?: ApiMeta;
};

export type UnitSystem = 'standard' | 'metric';

export type PersonalRecordByExercise = {
  exerciseTypeId: number | null;
  exerciseName: string;
  maxWeight: number | null;
  maxReps: number | null;
  fastestDurationMinutes: number | null;
};

export type UserDashboardStats = {
  unitSystem: UnitSystem;
  workoutsCompleted: number;
  personalRecords: {
    heaviestWeight: {
      value: number | null;
      workoutId: number | null;
      title: string | null;
    };
    fastestWorkout: {
      durationMinutes: number | null;
      workoutId: number | null;
      title: string | null;
    };
    highestReps: {
      reps: number | null;
      workoutId: number | null;
      title: string | null;
    };
    byExercise: PersonalRecordByExercise[];
  };
};
