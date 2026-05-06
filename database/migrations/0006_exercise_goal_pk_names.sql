DO $BODY$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'exercises'
      AND column_name = 'id'
  ) THEN
    ALTER TABLE "exercises" RENAME COLUMN "id" TO "exerciseId";
  END IF;
END
$BODY$;--> statement-breakpoint
DO $BODY$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'goals'
      AND column_name = 'id'
  ) THEN
    ALTER TABLE "goals" RENAME COLUMN "id" TO "goalId";
  END IF;
END
$BODY$;
