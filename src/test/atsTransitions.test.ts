import { describe, it, expect } from 'vitest';
import {
  checkStatusTransition,
  ATS_STATUSES,
  RECRUITER_SETTABLE_STATUSES,
} from '../backend/utils/atsTransitions.js';

describe('ATS State Machine & Transition Rules', () => {
  it('allows natural progression through candidate hiring stages', () => {
    expect(checkStatusTransition('applied', 'screening')).toEqual({ ok: true });
    expect(checkStatusTransition('screening', 'interview')).toEqual({ ok: true });
    expect(checkStatusTransition('interview', 'offer')).toEqual({ ok: true });
    expect(checkStatusTransition('offer', 'hired')).toEqual({ ok: true });
  });

  it('allows backward correction between non-terminal stages', () => {
    expect(checkStatusTransition('interview', 'screening')).toEqual({ ok: true });
    expect(checkStatusTransition('offer', 'interview')).toEqual({ ok: true });
  });

  it('allows rejection from any non-terminal state', () => {
    expect(checkStatusTransition('applied', 'rejected')).toEqual({ ok: true });
    expect(checkStatusTransition('screening', 'rejected')).toEqual({ ok: true });
    expect(checkStatusTransition('interview', 'rejected')).toEqual({ ok: true });
    expect(checkStatusTransition('offer', 'rejected')).toEqual({ ok: true });
  });

  it('prevents direct hiring without screening review', () => {
    const result = checkStatusTransition('applied', 'hired');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('must reach at least');
    }
  });

  it('blocks recruiters from marking application as withdrawn', () => {
    const result = checkStatusTransition('screening', 'withdrawn');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('Only the candidate can withdraw');
    }
  });

  it('enforces immutability on terminal statuses (hired, rejected, withdrawn)', () => {
    const terminalStatuses = ['hired', 'rejected', 'withdrawn'];
    for (const term of terminalStatuses) {
      const attempt = checkStatusTransition(term, 'screening');
      expect(attempt.ok).toBe(false);
      if (!attempt.ok) {
        expect(attempt.reason).toContain('final state');
      }
    }
  });

  it('allows idempotent no-op transitions for saving notes', () => {
    expect(checkStatusTransition('screening', 'screening')).toEqual({ ok: true });
    expect(checkStatusTransition('interview', 'interview')).toEqual({ ok: true });
  });

  it('rejects completely invalid status strings', () => {
    const invalid = checkStatusTransition('screening', 'promoted_to_ceo');
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.reason).toContain('not a valid status');
    }
  });
});
