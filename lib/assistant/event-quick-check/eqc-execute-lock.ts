/**
 * In-process lock so GET domain-reconcile does not start a second execute while
 * the 202 background poller is still alive in the same Node process.
 */

const locks = new Set<string>();

export function tryAcquireEqcExecuteLock(workflowRunId: string): boolean {
  const id = workflowRunId.trim();
  if (!id || locks.has(id)) return false;
  locks.add(id);
  return true;
}

export function releaseEqcExecuteLock(workflowRunId: string): void {
  locks.delete(workflowRunId.trim());
}

export function hasEqcExecuteLock(workflowRunId: string): boolean {
  return locks.has(workflowRunId.trim());
}
