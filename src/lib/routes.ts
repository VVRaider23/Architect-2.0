import { pendingRequest } from './stage';
import type { Project, Role } from './types';

/** Where each person lands in a project. */
export function homeFor(role: Role, p: Project | undefined): string {
  if (!p) return '/home';
  if (role === 'reviewer') return `/p/${p.id}/review`;
  if (role === 'approver') {
    const r = pendingRequest(p) ?? [...p.requests].reverse()[0];
    return r ? `/p/${p.id}/requests/${r.id}` : `/p/${p.id}/requests`;
  }
  return screenFor(p, 'builder');
}

/** The screen that fits where the project is right now. */
export function screenFor(p: Project, role: Role): string {
  if (role !== 'builder') return homeFor(role, p);
  if (!p.plan) return `/p/${p.id}/questions`;
  if (!p.planApproved) return `/p/${p.id}/plan`;
  if (p.build.status !== 'done') return `/p/${p.id}/build`;
  const fresh = p.runs.length === 1 && !p.invites.length && !p.changes.length && !p.tasks.length;
  return fresh ? `/p/${p.id}/ready` : `/p/${p.id}/app`;
}
