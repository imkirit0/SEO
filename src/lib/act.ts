'use client';

import { toast } from 'sonner';
import type { ActionResult } from './result';

/** Await a server action and surface its outcome as a toast. */
export async function act<T>(
  pending: Promise<ActionResult<T>>,
  success?: string | ((data: T | undefined) => string),
) {
  const res = await pending;
  if (!res.ok) toast.error(res.error ?? 'Something went wrong');
  else if (success) toast.success(typeof success === 'function' ? success(res.data) : success);
  return res;
}
