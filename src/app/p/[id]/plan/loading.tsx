'use client';

import { FocusSkeleton } from '@/components/skeletons';

/** Shows instantly while this screen loads: the same frame, with grey shapes where the content goes. */
export default function Loading() {
  return <FocusSkeleton section="build" label="the plan" />;
}
