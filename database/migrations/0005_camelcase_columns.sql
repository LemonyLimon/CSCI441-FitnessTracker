ALTER TABLE "users" RENAME COLUMN "payment_info" TO "paymentInfo";--> statement-breakpoint
ALTER TABLE "workouts" RENAME COLUMN "user_weight" TO "userWeight";--> statement-breakpoint
ALTER TABLE "exercises" RENAME COLUMN "workout_id" TO "workoutId";--> statement-breakpoint
ALTER TABLE "exercises" RENAME COLUMN "rest_time" TO "restTime";--> statement-breakpoint
ALTER TABLE "goals" RENAME COLUMN "user_id" TO "userId";--> statement-breakpoint
ALTER TABLE "goals" RENAME COLUMN "target_weight" TO "targetWeight";--> statement-breakpoint
ALTER TABLE "goals" RENAME COLUMN "exercise_type" TO "exerciseType";--> statement-breakpoint
ALTER TABLE "goals" RENAME COLUMN "target_time" TO "targetTime";--> statement-breakpoint
ALTER TABLE "goals" RENAME COLUMN "target_distance" TO "targetDistance";
