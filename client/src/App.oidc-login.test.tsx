import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { TOKEN_STORAGE_KEY } from '@/lib/oidc-fragment';
import { server } from './test/server';

const realLocation = window.location;

describe('App OIDC login', () => {
  let mockLocation: {
    href: string;
    assign: () => void;
    replace: () => void;
    reload: () => void;
  };
  let releaseHydrate: (() => void) | undefined;

  beforeEach(() => {
    mockLocation = {
      href: 'http://localhost/',
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
    };
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: mockLocation,
    });

    const hydrateGate = new Promise<void>((resolve) => {
      releaseHydrate = resolve;
    });

    server.use(
      http.get('/api/auth/options', () =>
        HttpResponse.json({
          data: { oidc: true, demo: true },
          meta: {},
        }),
      ),
      http.get('/api/me', async () => {
        await hydrateGate;
        return HttpResponse.json(
          {
            error: { code: 'invalid_token', message: 'invalid access token' },
          },
          { status: 401 },
        );
      }),
    );
  });

  afterEach(() => {
    releaseHydrate?.();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: realLocation,
    });
  });

  it('clears stored JWT then navigates to OIDC login', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'prior-session-jwt');
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      await screen.findByRole('button', { name: 'Continue with Auth0' }),
    );

    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(mockLocation.href).toContain('/api/auth/oidc/login');
    expect(mockLocation.href).toContain('next=');
  });
});
