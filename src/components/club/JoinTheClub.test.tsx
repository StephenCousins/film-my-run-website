// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSyncExternalStore } from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';

type Tier = 'FREE' | 'PRO';
const h = vi.hoisted(() => ({
  tier: 'FREE' as 'FREE' | 'PRO',
  status: 'authenticated' as 'authenticated' | 'loading',
  joined: true,
  update: vi.fn(),
  listeners: new Set<() => void>(),
  version: 0,
}));
// Like next-auth: while update() runs the status is 'loading', and every render gets a new
// update function. A loop tied to either would stop after its first check.
const changed = () => {
  h.version++;
  h.listeners.forEach((l) => l());
};
const useStore = () =>
  useSyncExternalStore(
    (l) => (h.listeners.add(l), () => h.listeners.delete(l)),
    () => h.version,
  );
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(h.joined ? 'joined=1' : '') }));
vi.mock('next-auth/react', () => ({
  useSession: () => {
    useStore();
    return {
      update: async () => {
        h.status = 'loading';
        changed();
        try {
          return await h.update();
        } finally {
          h.status = 'authenticated';
          changed();
        }
      },
    };
  },
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => {
    useStore();
    return {
      isAuthenticated: h.status === 'authenticated',
      status: h.status,
      hasAccess: (t: Tier) => h.status === 'authenticated' && (t === 'FREE' || h.tier === 'PRO'),
    };
  },
}));

import JoinTheClub, { JOIN_CHECKS, JOIN_CHECK_GAP_MS } from './JoinTheClub';

const session = (tier: Tier) => ({ user: { id: '24', email: 'a@b.co', accessTier: tier }, expires: '' });
const joinButtons = () => screen.queryByRole('button', { name: /Join for/ });
const flush = () => act(() => vi.advanceTimersByTimeAsync(0));

describe('JoinTheClub back from Stripe (?joined=1)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    h.tier = 'FREE';
    h.status = 'authenticated';
    h.joined = true;
    h.update.mockReset();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('refreshes the session, waits without the join buttons, then welcomes once the webhook has run', async () => {
    // The webhook lands between the first and second check.
    h.update.mockResolvedValueOnce(session('FREE')).mockResolvedValue(session('PRO'));
    render(<JoinTheClub monthlyPence={299} yearlyPence={2900} />);
    await flush();
    expect(h.update).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Switching on your FMR Club membership/)).toBeTruthy();
    expect(joinButtons()).toBeNull();

    await act(() => vi.advanceTimersByTimeAsync(JOIN_CHECK_GAP_MS));
    expect(h.update).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/Welcome to FMR Club/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Manage your membership' })).toBeTruthy();
    expect(joinButtons()).toBeNull();

    // And it stops checking.
    await act(() => vi.advanceTimersByTimeAsync(JOIN_CHECK_GAP_MS * 5));
    expect(h.update).toHaveBeenCalledTimes(2);
  });

  it('welcomes at once when the cookie is already PRO', async () => {
    h.tier = 'PRO';
    h.update.mockResolvedValue(session('PRO'));
    render(<JoinTheClub monthlyPence={299} yearlyPence={2900} />);
    await flush();
    expect(screen.getByText(/Welcome to FMR Club/)).toBeTruthy();
  });

  it('gives up calmly after a few checks, without offering checkout again', async () => {
    h.update.mockResolvedValue(session('FREE'));
    render(<JoinTheClub monthlyPence={299} yearlyPence={2900} />);
    await act(() => vi.advanceTimersByTimeAsync(JOIN_CHECK_GAP_MS * (JOIN_CHECKS + 3)));
    expect(h.update).toHaveBeenCalledTimes(JOIN_CHECKS);
    expect(screen.getByText(/your payment went through/)).toBeTruthy();
    expect(joinButtons()).toBeNull();
  });

  it('without ?joined=1 it shows the join buttons and does not refresh', async () => {
    h.joined = false;
    render(<JoinTheClub monthlyPence={299} yearlyPence={2900} />);
    await flush();
    expect(joinButtons()).toBeTruthy();
    expect(h.update).not.toHaveBeenCalled();
  });
});
