import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('supports guest login and workout CRUD', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      await screen.findByRole('button', { name: 'Continue as guest' }),
    );
    expect(await screen.findByText(/Guest Test/)).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText('New custom exercise'),
      'Row Variation',
    );
    await user.click(screen.getByRole('button', { name: 'Add' }));
    const exerciseMatches = await screen.findAllByText('Row Variation');
    expect(exerciseMatches.length).toBeGreaterThan(0);

    await user.type(screen.getByPlaceholderText('Workout title'), 'Upper Day');
    await user.type(
      screen.getByPlaceholderText('Notes (optional)'),
      'Push and pull',
    );
    await user.type(screen.getByLabelText('Weight'), '135');
    await user.type(screen.getByLabelText('Reps'), '8');
    await user.click(screen.getByRole('button', { name: 'Create workout' }));

    expect(await screen.findByText('Upper Day')).toBeInTheDocument();

    const workoutTitle = await screen.findByText('Upper Day');
    const workoutCard = workoutTitle.closest('li');
    expect(workoutCard).not.toBeNull();
    await user.click(
      within(workoutCard!).getByRole('button', { name: 'Delete' }),
    );
    expect(screen.queryByText('Upper Day')).not.toBeInTheDocument();
  });
});
