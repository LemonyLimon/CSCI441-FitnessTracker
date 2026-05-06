import {
  boolean,
  decimal,
  integer,
  interval,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  userId: serial('userId').primaryKey(),
  authSubject: text('authSubject').notNull().unique(),
  email: text('email').unique(),
  passwordHash: text('passwordHash'),
  isGuest: boolean('isGuest').notNull().default(false),
  displayName: text('displayName').notNull(),
  uiHighContrast: boolean('uiHighContrast').notNull().default(false),
  uiTextSize: text('uiTextSize').notNull().default('normal'),
  createdAt: timestamp('createdAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
  height: integer('height'),
  paymentInfo: varchar('paymentInfo', { length: 255 }),
});

export const exerciseTypes = pgTable(
  'exercise_types',
  {
    exerciseTypeId: serial('exerciseTypeId').primaryKey(),
    userId: integer('userId').references(() => users.userId, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),
    muscleGroup: text('muscleGroup'),
    category: text('category').notNull().default('resistance'),
    createdAt: timestamp('createdAt', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique('exercise_types_user_name_unique').on(t.userId, t.name)],
);

export const workouts = pgTable('workouts', {
  workoutId: serial('workoutId').primaryKey(),
  userId: integer('userId')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  notes: text('notes'),
  exerciseTypeId: integer('exerciseTypeId').references(
    () => exerciseTypes.exerciseTypeId,
    { onDelete: 'set null' },
  ),
  startedAt: timestamp('startedAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
  endedAt: timestamp('endedAt', { withTimezone: true }),
  durationMinutes: real('durationMinutes'),
  createdAt: timestamp('createdAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true })
    .notNull()
    .defaultNow(),
  date: timestamp('date', { withTimezone: true }),
  userWeight: decimal('userWeight', { precision: 10, scale: 2 }),
  reps: integer('reps'),
});

export const exercises = pgTable('exercises', {
  exerciseId: serial('exerciseId').primaryKey(),
  workoutId: integer('workoutId')
    .notNull()
    .references(() => workouts.workoutId, { onDelete: 'cascade' }),
  type: integer('type')
    .notNull()
    .references(() => exerciseTypes.exerciseTypeId, { onDelete: 'restrict' }),
  sets: integer('sets'),
  reps: integer('reps'),
  weights: decimal('weights', { precision: 10, scale: 2 }),
  duration: interval('duration'),
  distance: decimal('distance', { precision: 10, scale: 2 }),
  restTime: interval('restTime'),
});

export const goals = pgTable('goals', {
  goalId: serial('goalId').primaryKey(),
  userId: integer('userId')
    .notNull()
    .references(() => users.userId, { onDelete: 'cascade' }),
  targetWeight: decimal('targetWeight', { precision: 10, scale: 2 }),
  exerciseType: integer('exerciseType').references(
    () => exerciseTypes.exerciseTypeId,
    { onDelete: 'set null' },
  ),
  targetTime: interval('targetTime'),
  targetDistance: decimal('targetDistance', { precision: 10, scale: 2 }),
});
