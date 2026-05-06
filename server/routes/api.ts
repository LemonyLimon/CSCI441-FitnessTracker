import { Router } from 'express'; // Router is a function that creates a new router object. Router are attached to the app object.

// Imports for request handlers.
import {
  getMe,
  patchMePreferences,
  postAuthGuest,
  postAuthSignIn,
} from '@server/controllers/auth-controller.js';
import {
  getExercises as getExerciseRows,
  patchExercise as patchExerciseRow,
  postExercise as postExerciseRow,
  removeExercise as removeExerciseRow,
} from '@server/controllers/exercise-controller.js';
import {
  getExercises,
  patchExercise,
  postExercise,
  removeExercise,
} from '@server/controllers/exercise-type-controller.js';
import {
  readHealth,
  readReady,
} from '@server/controllers/health-controller.js';
import {
  getGoals,
  patchGoal,
  postGoal,
  removeGoal,
} from '@server/controllers/goal-controller.js';
import {
  patchUserProfile,
  postUserProfile,
  putUserProfile,
  resetProfileFields,
} from '@server/controllers/profile-controller.js';
import {
  getWorkouts,
  patchWorkout,
  postWorkout,
  removeWorkout,
} from '@server/controllers/workout-controller.js';
import { authMiddleware } from '@server/lib/authorization-middleware.js';

/** Central API router for public, auth-protected, health, goals, profile, and workout endpoints. */
const apiRouter = Router();

apiRouter.get('/health', readHealth);
apiRouter.get('/ready', readReady);
apiRouter.post('/auth/guest', postAuthGuest);
apiRouter.post('/auth/sign-in', postAuthSignIn);
apiRouter.get('/me', authMiddleware, getMe);
apiRouter.patch('/me/preferences', authMiddleware, patchMePreferences);
apiRouter.get('/me/goals', authMiddleware, getGoals);
apiRouter.post('/me/goals', authMiddleware, postGoal);
apiRouter.patch('/me/goals/:goalId', authMiddleware, patchGoal);
apiRouter.delete('/me/goals/:goalId', authMiddleware, removeGoal);
apiRouter.post('/me/profile', authMiddleware, postUserProfile);
apiRouter.put('/me/profile', authMiddleware, putUserProfile);
apiRouter.patch('/me/profile', authMiddleware, patchUserProfile);
apiRouter.delete('/me/profile', authMiddleware, resetProfileFields);
apiRouter.get('/workouts', authMiddleware, getWorkouts);
apiRouter.post('/workouts', authMiddleware, postWorkout);
apiRouter.patch('/workouts/:workoutId', authMiddleware, patchWorkout);
apiRouter.delete('/workouts/:workoutId', authMiddleware, removeWorkout);
apiRouter.get('/exercise-types', authMiddleware, getExercises);
apiRouter.post('/exercise-types', authMiddleware, postExercise);
apiRouter.patch(
  '/exercise-types/:exerciseTypeId',
  authMiddleware,
  patchExercise,
);
apiRouter.delete(
  '/exercise-types/:exerciseTypeId',
  authMiddleware,
  removeExercise,
);
apiRouter.get('/exercises', authMiddleware, getExerciseRows);
apiRouter.post('/exercises', authMiddleware, postExerciseRow);
apiRouter.patch('/exercises/:exerciseId', authMiddleware, patchExerciseRow);
apiRouter.delete('/exercises/:exerciseId', authMiddleware, removeExerciseRow);

// Exports the router object so it can be used in the app.
export default apiRouter;
