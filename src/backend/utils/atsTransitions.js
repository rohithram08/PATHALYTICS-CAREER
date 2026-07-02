// src/backend/utils/atsTransitions.js
// ─────────────────────────────────────────────────────────────
// Application Tracking System state machine.
//
// Canonical pipeline (matches the vocabulary already used by the
// recruiter dashboard UI — RecruiterDashboard.tsx / RecruiterCandidates.tsx
// / RecruiterAnalytics.tsx — rather than the spec doc's exact wording,
// since that UI already ships with these exact labels):
//
//   applied → screening → interview → offer → hired
//                  ↘          ↘         ↘
//                       rejected (terminal)
//
//   withdrawn is a separate terminal state, only ever set by the
//   candidate themselves via POST /api/applications/:id/withdraw —
//   it is intentionally NOT a target recruiters can set directly.
//
// Rules:
//   • From any non-terminal state, a recruiter can move to any other
//     non-terminal state (including "backward" — e.g. bumping someone
//     back from interview to screening is a normal correction) or to
//     'rejected'.
//   • 'hired' requires the candidate to have reached at least
//     'screening' first — you can't hire someone who's merely applied
//     without ever having looked at them.
//   • 'hired', 'rejected', and 'withdrawn' are terminal — once there,
//     no further transitions are allowed through this endpoint.
// ─────────────────────────────────────────────────────────────

export const ATS_STATUSES = Object.freeze([
  "applied", "screening", "interview", "offer", "hired", "rejected", "withdrawn",
]);

// Statuses a recruiter is allowed to set directly (excludes 'withdrawn',
// which is candidate-initiated only).
export const RECRUITER_SETTABLE_STATUSES = Object.freeze([
  "applied", "screening", "interview", "offer", "hired", "rejected",
]);

const TERMINAL_STATUSES = new Set(["hired", "rejected", "withdrawn"]);
const NON_TERMINAL_STATUSES = ["applied", "screening", "interview", "offer"];
const HIRE_ELIGIBLE_FROM = new Set(["screening", "interview", "offer"]);

/**
 * @param {string} from current status
 * @param {string} to   requested next status
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function checkStatusTransition(from, to) {
  if (!ATS_STATUSES.includes(to)) {
    return { ok: false, reason: `'${to}' is not a valid status.` };
  }
  if (from === to) {
    return { ok: true }; // no-op, e.g. re-saving notes without changing stage
  }
  if (TERMINAL_STATUSES.has(from)) {
    return { ok: false, reason: `This application is already '${from}', which is a final state.` };
  }
  if (to === "withdrawn") {
    return { ok: false, reason: "Only the candidate can withdraw their own application." };
  }
  if (to === "hired") {
    if (!HIRE_ELIGIBLE_FROM.has(from)) {
      return { ok: false, reason: "A candidate must reach at least 'screening' before being marked hired." };
    }
    return { ok: true };
  }
  // Anything else — 'rejected', or moving between applied/screening/interview/offer
  // in either direction — is allowed from a non-terminal state.
  return { ok: true };
}
