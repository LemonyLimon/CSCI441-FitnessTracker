import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { resetApiMockState } from './handlers';
import { server } from './server';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  // Ensure each test starts from a clean DOM and clean API mock state.
  cleanup();
  server.resetHandlers();
  resetApiMockState();
});

afterAll(() => {
  server.close();
});
