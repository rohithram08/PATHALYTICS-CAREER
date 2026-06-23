// src/backend/utils/companyTier.js
//
// Classifies a recruiter's company into a tier based on the domain of the
// email they sign up with, and decides whether verification documents
// are required before the account is usable.
//
// Tiers:
//   top  — a small, manually curated list of well-known employers.
//          Extend TOP_TIER_DOMAINS below as you vet more companies;
//          nothing else in the codebase needs to change when you do.
//   mid  — any other domain that isn't a free consumer email provider.
//          Trusted on the strength of owning the domain — no document
//          upload required.
//   low  — free/consumer email providers (gmail, yahoo, outlook, etc.).
//          Common for small startups without a company domain yet.
//          Requires verification documents before the account is usable.

const FREE_EMAIL_PROVIDERS = new Set([
  "gmail.com",
  "yahoo.com",
  "yahoo.co.in",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "protonmail.com",
  "proton.me",
  "aol.com",
  "rediffmail.com",
  "zoho.com",
  "yandex.com",
  "mail.com",
  "gmx.com",
]);

// Manually curated — add domains here as you vet more top-tier employers.
// Keep this list small and deliberate; it's meant for companies you'd
// trust on sight, not a general allowlist.
const TOP_TIER_DOMAINS = new Set([
  "google.com",
  "microsoft.com",
  "amazon.com",
  "apple.com",
  "meta.com",
  "tcs.com",
  "infosys.com",
  "wipro.com",
  "accenture.com",
]);

export const extractDomain = (email) => {
  const at = email.lastIndexOf("@");
  return at === -1 ? "" : email.slice(at + 1).toLowerCase().trim();
};

/**
 * @param {string} email - the recruiter's signup email
 * @returns {{ domain: string, tier: 'top'|'mid'|'low', verificationStatus: 'verified'|'pending', requiresDocuments: boolean }}
 */
export const classifyCompanyTier = (email) => {
  const domain = extractDomain(email);

  if (!domain || FREE_EMAIL_PROVIDERS.has(domain)) {
    return {
      domain,
      tier: "low",
      verificationStatus: "pending",
      requiresDocuments: true,
    };
  }

  if (TOP_TIER_DOMAINS.has(domain)) {
    return {
      domain,
      tier: "top",
      verificationStatus: "verified",
      requiresDocuments: false,
    };
  }

  return {
    domain,
    tier: "mid",
    verificationStatus: "verified",
    requiresDocuments: false,
  };
};