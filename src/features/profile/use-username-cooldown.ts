import { useEffect, useState } from 'react';

import {
  usernameCooldownLabel,
  usernameCooldownRemaining,
  usernameCooldownSummary,
} from './username';

/**
 * The live username cooldown for a profile.
 *
 * The server owns the window; this only renders the remaining time and ticks once a minute while
 * it is active, so a player watching Settings sees the countdown reach "change now" without a
 * relaunch.
 */
export function useUsernameCooldown(changedAt: string | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (usernameCooldownRemaining(changedAt, Date.now()) === 0) return;

    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [changedAt]);

  const remaining = usernameCooldownRemaining(changedAt, now);

  return {
    active: remaining > 0,
    remaining,
    label: usernameCooldownLabel(changedAt, now),
    summary: usernameCooldownSummary(changedAt, now),
  };
}
