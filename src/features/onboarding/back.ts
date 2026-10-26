import { router, type Href } from 'expo-router';

/**
 * Leave an onboarding step without assuming there is history.
 *
 * A returning player can be routed straight into the middle of onboarding on a cold start, so
 * `router.back()` has nothing to pop. Use the step's predecessor instead of letting expo-router
 * fail to assemble an initial navigation state.
 */
export function goBackOr(fallback: Href): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}
