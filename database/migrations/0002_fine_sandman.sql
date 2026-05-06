CREATE TABLE "exercise_types" (
	"exerciseTypeId" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"name" text NOT NULL,
	"muscleGroup" text,
	"category" text DEFAULT 'resistance' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercise_types_user_name_unique" UNIQUE("userId","name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"userId" serial PRIMARY KEY NOT NULL,
	"authSubject" text NOT NULL,
	"email" text,
	"passwordHash" text,
	"isGuest" boolean DEFAULT false NOT NULL,
	"displayName" text NOT NULL,
	"uiHighContrast" boolean DEFAULT false NOT NULL,
	"uiTextSize" text DEFAULT 'normal' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_authSubject_unique" UNIQUE("authSubject"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"workoutId" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"exerciseTypeId" integer,
	"startedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"endedAt" timestamp with time zone,
	"durationMinutes" real,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exercise_types" ADD CONSTRAINT "exercise_types_userId_users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_userId_users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_exerciseTypeId_exercise_types_exerciseTypeId_fk" FOREIGN KEY ("exerciseTypeId") REFERENCES "public"."exercise_types"("exerciseTypeId") ON DELETE set null ON UPDATE no action;