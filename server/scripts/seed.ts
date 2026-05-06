import argon2 from 'argon2';
import { count, eq, isNull } from 'drizzle-orm';
import { env } from '@server/config/env.js';
import { getDrizzleDb } from '@server/db/drizzle.js';
import { exerciseTypes, users } from '@server/db/schema.js';
import { logger } from '@server/lib/logger.js';

/**
 * Seed default user and exercise catalog rows if missing.
 */
async function seedData(): Promise<void> {
  const db = getDrizzleDb();
  if (!db) {
    throw new Error('DATABASE_URL is required to run db:seed');
  }

  const demoEmail = 'user@example.com';
  const demoPassword = 'password123';
  const [existingUser] = await db
    .select({ userId: users.userId })
    .from(users)
    .where(eq(users.email, demoEmail))
    .limit(1);

  if (!existingUser) {
    const passwordHash = await argon2.hash(demoPassword);
    await db.insert(users).values({
      authSubject: 'seed:user@example.com',
      email: demoEmail,
      passwordHash,
      isGuest: false,
      displayName: 'Demo User',
    });
    logger.info({ demoEmail }, 'Seeded demo user account');
  }

  const [{ totalSeedExercises }] = await db
    .select({ totalSeedExercises: count() })
    .from(exerciseTypes)
    .where(isNull(exerciseTypes.userId));
  if (totalSeedExercises > 0) {
    logger.info(
      { totalSeedExercises },
      'Skipping seed: exercise catalog already populated',
    );
    return;
  }

  await db.insert(exerciseTypes).values([
    { name: 'Back Squat', muscleGroup: 'legs', category: 'resistance' },
    { name: 'Bench Press', muscleGroup: 'chest', category: 'resistance' },
    {
      name: 'Deadlift',
      muscleGroup: 'posterior chain',
      category: 'resistance',
    },
    {
      name: 'Overhead Press',
      muscleGroup: 'shoulders',
      category: 'resistance',
    },
    { name: 'Pull-Up', muscleGroup: 'back', category: 'resistance' },
    { name: 'Plank', muscleGroup: 'core', category: 'flexibility' },
    { name: 'Bike Ride', muscleGroup: 'cardio', category: 'cardio' },
  ]);
  logger.info('Seeded default exercise catalog');
}

seedData()
  .catch((err) => {
    logger.error({ err }, 'db:seed failed');
    process.exitCode = 1;
  })
  .finally(() => {
    logger.info({ nodeEnv: env.NODE_ENV }, 'db:seed completed');
  });
