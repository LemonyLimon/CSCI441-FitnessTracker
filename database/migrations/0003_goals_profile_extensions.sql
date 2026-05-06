ALTER TABLE "users" ADD COLUMN "height" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "payment_info" varchar(255);--> statement-breakpoint
ALTER TABLE "workouts" ADD COLUMN "date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workouts" ADD COLUMN "user_weight" numeric(10, 2);--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"workout_id" integer NOT NULL,
	"type" integer NOT NULL,
	"sets" integer,
	"reps" integer,
	"weights" numeric(10, 2),
	"duration" interval,
	"distance" numeric(10, 2),
	"rest_time" interval
);--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_workout_id_workouts_workoutId_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("workoutId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_type_exercise_types_exerciseTypeId_fk" FOREIGN KEY ("type") REFERENCES "public"."exercise_types"("exerciseTypeId") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"target_weight" numeric(10, 2),
	"exercise_type" integer,
	"target_time" interval,
	"target_distance" numeric(10, 2)
);--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_userId_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("userId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_exercise_type_exercise_types_exerciseTypeId_fk" FOREIGN KEY ("exercise_type") REFERENCES "public"."exercise_types"("exerciseTypeId") ON DELETE set null ON UPDATE no action;
