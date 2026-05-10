// =======================================================
// Country / Currency Detection & Formatting
// =======================================================

export type CountryCode =
  | 'IN' | 'US' | 'JP' | 'GB' | 'DE' | 'FR' | 'AU' | 'CA'
  | 'SG' | 'AE' | 'CN' | 'KR' | 'BR' | 'ZA' | 'NG' | 'PH';

export interface CountryInfo {
  code: CountryCode;
  name: string;
  currency: string;
  symbol: string;
  phoneCode: string;
  emailTld: string[];
  exchangeFromUSD: number;
  marketMultiplier: { fresher: number; experienced: number };
  format: 'k' | 'lpa' | 'million';
  timezones: string[]; // ✅ NEW
}

const COUNTRIES: Record<CountryCode, CountryInfo> = {
  US: {
    code: 'US', name: 'United States', currency: 'USD', symbol: '$',
    phoneCode: '+1', emailTld: ['.com', '.us'],
    exchangeFromUSD: 1, marketMultiplier: { fresher: 0.55, experienced: 1.0 },
    format: 'k',
    timezones: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu'],
  },
  IN: {
    code: 'IN', name: 'India', currency: 'INR', symbol: '₹',
    phoneCode: '+91', emailTld: ['.in', '.co.in'],
    exchangeFromUSD: 83, marketMultiplier: { fresher: 0.07, experienced: 0.25 },
    format: 'lpa',
    timezones: ['Asia/Kolkata', 'Asia/Calcutta'],
  },
  JP: {
    code: 'JP', name: 'Japan', currency: 'JPY', symbol: '¥',
    phoneCode: '+81', emailTld: ['.jp', '.co.jp'],
    exchangeFromUSD: 150, marketMultiplier: { fresher: 0.35, experienced: 0.55 },
    format: 'million',
    timezones: ['Asia/Tokyo'],
  },
  GB: {
    code: 'GB', name: 'United Kingdom', currency: 'GBP', symbol: '£',
    phoneCode: '+44', emailTld: ['.uk', '.co.uk'],
    exchangeFromUSD: 0.79, marketMultiplier: { fresher: 0.50, experienced: 0.78 },
    format: 'k',
    timezones: ['Europe/London'],
  },
  DE: {
    code: 'DE', name: 'Germany', currency: 'EUR', symbol: '€',
    phoneCode: '+49', emailTld: ['.de'],
    exchangeFromUSD: 0.92, marketMultiplier: { fresher: 0.48, experienced: 0.72 },
    format: 'k',
    timezones: ['Europe/Berlin'],
  },
  FR: {
    code: 'FR', name: 'France', currency: 'EUR', symbol: '€',
    phoneCode: '+33', emailTld: ['.fr'],
    exchangeFromUSD: 0.92, marketMultiplier: { fresher: 0.42, experienced: 0.68 },
    format: 'k',
    timezones: ['Europe/Paris'],
  },
  AU: {
    code: 'AU', name: 'Australia', currency: 'AUD', symbol: 'A$',
    phoneCode: '+61', emailTld: ['.au', '.com.au'],
    exchangeFromUSD: 1.52, marketMultiplier: { fresher: 0.55, experienced: 0.80 },
    format: 'k',
    timezones: ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Perth', 'Australia/Adelaide'],
  },
  CA: {
    code: 'CA', name: 'Canada', currency: 'CAD', symbol: 'C$',
    phoneCode: '+1', emailTld: ['.ca'],
    exchangeFromUSD: 1.36, marketMultiplier: { fresher: 0.52, experienced: 0.78 },
    format: 'k',
    timezones: ['America/Toronto', 'America/Vancouver', 'America/Montreal', 'America/Edmonton'],
  },
  SG: {
    code: 'SG', name: 'Singapore', currency: 'SGD', symbol: 'S$',
    phoneCode: '+65', emailTld: ['.sg', '.com.sg'],
    exchangeFromUSD: 1.34, marketMultiplier: { fresher: 0.55, experienced: 0.85 },
    format: 'k',
    timezones: ['Asia/Singapore'],
  },
  AE: {
    code: 'AE', name: 'UAE', currency: 'AED', symbol: 'AED',
    phoneCode: '+971', emailTld: ['.ae'],
    exchangeFromUSD: 3.67, marketMultiplier: { fresher: 0.40, experienced: 0.70 },
    format: 'k',
    timezones: ['Asia/Dubai'],
  },
  CN: {
    code: 'CN', name: 'China', currency: 'CNY', symbol: '¥',
    phoneCode: '+86', emailTld: ['.cn'],
    exchangeFromUSD: 7.2, marketMultiplier: { fresher: 0.20, experienced: 0.50 },
    format: 'k',
    timezones: ['Asia/Shanghai', 'Asia/Beijing'],
  },
  KR: {
    code: 'KR', name: 'South Korea', currency: 'KRW', symbol: '₩',
    phoneCode: '+82', emailTld: ['.kr', '.co.kr'],
    exchangeFromUSD: 1380, marketMultiplier: { fresher: 0.40, experienced: 0.62 },
    format: 'million',
    timezones: ['Asia/Seoul'],
  },
  BR: {
    code: 'BR', name: 'Brazil', currency: 'BRL', symbol: 'R$',
    phoneCode: '+55', emailTld: ['.br', '.com.br'],
    exchangeFromUSD: 5.0, marketMultiplier: { fresher: 0.12, experienced: 0.35 },
    format: 'k',
    timezones: ['America/Sao_Paulo'],
  },
  ZA: {
    code: 'ZA', name: 'South Africa', currency: 'ZAR', symbol: 'R',
    phoneCode: '+27', emailTld: ['.za', '.co.za'],
    exchangeFromUSD: 18.5, marketMultiplier: { fresher: 0.10, experienced: 0.32 },
    format: 'k',
    timezones: ['Africa/Johannesburg'],
  },
  NG: {
    code: 'NG', name: 'Nigeria', currency: 'NGN', symbol: '₦',
    phoneCode: '+234', emailTld: ['.ng', '.com.ng'],
    exchangeFromUSD: 1500, marketMultiplier: { fresher: 0.05, experienced: 0.18 },
    format: 'million',
    timezones: ['Africa/Lagos'],
  },
  PH: {
    code: 'PH', name: 'Philippines', currency: 'PHP', symbol: '₱',
    phoneCode: '+63', emailTld: ['.ph', '.com.ph'],
    exchangeFromUSD: 56, marketMultiplier: { fresher: 0.08, experienced: 0.25 },
    format: 'k',
    timezones: ['Asia/Manila'],
  },
};

// =======================================================
// Country Detection
// =======================================================

/** ✅ NEW: Detect from browser timezone — works without login */
export function detectCountryFromTimezone(): CountryCode | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return null;

    for (const country of Object.values(COUNTRIES)) {
      if (country.timezones.includes(tz)) {
        return country.code;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** ✅ NEW: Detect from browser language (e.g. "en-IN", "ja-JP") */
export function detectCountryFromLanguage(): CountryCode | null {
  try {
    const langs = navigator.languages || [navigator.language];
    for (const lang of langs) {
      const parts = lang.split('-');
      if (parts.length >= 2) {
        const region = parts[1].toUpperCase() as CountryCode;
        if (COUNTRIES[region]) return region;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Detect from phone number */
export function detectCountryFromPhone(phone: string | undefined): CountryCode | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  const sorted = Object.values(COUNTRIES).sort(
    (a, b) => b.phoneCode.length - a.phoneCode.length
  );
  for (const c of sorted) {
    if (cleaned.startsWith(c.phoneCode)) return c.code;
  }
  return null;
}

/** Detect from email TLD */
export function detectCountryFromEmail(email: string | undefined): CountryCode | null {
  if (!email) return null;
  const lower = email.toLowerCase().trim();
  const all = Object.values(COUNTRIES).flatMap((c) =>
    c.emailTld.map((tld) => ({ tld, code: c.code }))
  );
  all.sort((a, b) => b.tld.length - a.tld.length);
  for (const { tld, code } of all) {
    if (lower.endsWith(tld) && tld !== '.com') return code;
  }
  return null;
}

/**
 * ✅ UPDATED Master detector with priority:
 *   1. Phone number (most reliable when available)
 *   2. Email TLD
 *   3. Browser timezone (e.g. Asia/Kolkata → India) ← BIG IMPROVEMENT
 *   4. Browser language (e.g. en-IN → India)
 *   5. Fallback (default US)
 */
export function detectCountry(opts: {
  phone?: string;
  email?: string;
  fallback?: CountryCode;
}): CountryCode {
  const detected =
    detectCountryFromPhone(opts.phone) ||
    detectCountryFromEmail(opts.email) ||
    detectCountryFromTimezone() ||
    detectCountryFromLanguage();

  if (detected) {
    console.log('🌍 Country detected:', detected, {
      phone: !!opts.phone,
      email: !!opts.email,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      lang: navigator.language,
    });
  }

  return detected || opts.fallback || 'US';
}

export function getCountryInfo(code: CountryCode): CountryInfo {
  return COUNTRIES[code];
}

// =======================================================
// Salary Formatting (unchanged)
// =======================================================

export interface SalaryRange {
  fresher: { min: number; max: number };
  experienced: { min: number; max: number };
}

export type ExperienceLevel = 'fresher' | 'experienced';

export function formatSalary(
  range: SalaryRange,
  country: CountryCode,
  level: ExperienceLevel
): string {
  const info = getCountryInfo(country);
  const usd = range[level];
  const localMin = usd.min * info.marketMultiplier[level] * info.exchangeFromUSD;
  const localMax = usd.max * info.marketMultiplier[level] * info.exchangeFromUSD;

  switch (info.format) {
    case 'lpa': {
      const minL = Math.round(localMin / 100000);
      const maxL = Math.round(localMax / 100000);
      return `${info.symbol}${minL} – ${info.symbol}${maxL} LPA`;
    }
    case 'million': {
      const minM = (localMin / 1_000_000).toFixed(1);
      const maxM = (localMax / 1_000_000).toFixed(1);
      return `${info.symbol}${minM}M – ${info.symbol}${maxM}M`;
    }
    case 'k':
    default: {
      const minK = Math.round(localMin / 1000);
      const maxK = Math.round(localMax / 1000);
      return `${info.symbol}${minK}k – ${info.symbol}${maxK}k`;
    }
  }
}

export function formatSalaryBoth(range: SalaryRange, country: CountryCode) {
  return {
    country: getCountryInfo(country).name,
    currency: getCountryInfo(country).currency,
    fresher: formatSalary(range, country, 'fresher'),
    experienced: formatSalary(range, country, 'experienced'),
  };
}