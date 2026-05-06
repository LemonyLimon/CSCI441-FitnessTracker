set client_min_messages to warning;

-- DANGER: this is NOT how to do it in the real world.
-- `drop schema` INSTANTLY ERASES EVERYTHING.
drop schema "public" cascade;

create schema "public";

create table "users" (
  "userId" serial primary key,
  "authSubject" text not null unique,
  "email" text unique,
  "passwordHash" text,
  "isGuest" boolean not null default false,
  "displayName" text not null,
  "uiHighContrast" boolean not null default false,
  "uiTextSize" text not null default 'normal',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "height" integer,
  "paymentInfo" varchar(255)
);

create table "exercise_types" (
  "exerciseTypeId" serial primary key,
  "userId" integer references "users"("userId") on delete cascade,
  "name" text not null,
  "muscleGroup" text,
  "category" text not null default 'resistance',
  "createdAt" timestamptz not null default now()
);

create unique index "exercise_types_user_name_unique"
  on "exercise_types" ("userId", "name");

create table "workouts" (
  "workoutId" serial primary key,
  "userId" integer not null references "users"("userId") on delete cascade,
  "title" text not null,
  "notes" text,
  "exerciseTypeId" integer references "exercise_types"("exerciseTypeId") on delete set null,
  "startedAt" timestamptz not null default now(),
  "endedAt" timestamptz,
  "durationMinutes" real,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "date" timestamptz,
  "userWeight" numeric(10, 2),
  "reps" integer
);

create table "exercises" (
  "exerciseId" serial primary key,
  "workoutId" integer not null references "workouts"("workoutId") on delete cascade,
  "type" integer not null references "exercise_types"("exerciseTypeId") on delete restrict,
  "sets" integer,
  "reps" integer,
  "weights" numeric(10, 2),
  "duration" interval,
  "distance" numeric(10, 2),
  "restTime" interval
);

create table "goals" (
  "goalId" serial primary key,
  "userId" integer not null references "users"("userId") on delete cascade,
  "targetWeight" numeric(10, 2),
  "exerciseType" integer references "exercise_types"("exerciseTypeId") on delete set null,
  "targetTime" interval,
  "targetDistance" numeric(10, 2)
);
