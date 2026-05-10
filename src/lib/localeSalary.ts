import { CountryCode, ExperienceLevel, getCountryInfo } from './locale';

/**
 * Parse a USD salary string like "\$80k - \$150k" into numeric min/max in USD.
 * The min is treated as the "junior end" and max as the "senior end" of the band.
 */
export function parseUsdSalaryString(s: string): { min: number; max: number } | null {
  if (!s) return null;
  if (s.toLowerCase().includes('variable')) return null;

  const matches = s.match(/\$?([\d.]+)\s*([kKmM])?/g);
  if (!matches || matches.length < 2) return null;

  const toNumber = (m: string): number => {
    const num = parseFloat(m.replace(/[^0-9.]/g, ''));
    if (/[mM]/.test(m)) return num * 1_000_000;
    if (/[kK]/.test(m)) return num * 1_000;
    return num;
  };

  return { min: toNumber(matches[0]), max: toNumber(matches[1]) };
}

/**
 * ✅ FIXED: Convert a USD salary string into a localized string.
 *
 * For "\$80k - \$150k":
 *   - FRESHER:     uses the LOWER half of the band (\$80k–\$110k)
 *   - EXPERIENCED: uses the UPPER half of the band (\$110k–\$150k)
 *
 * Then applies country-specific market multiplier and currency conversion.
 */
export function localizeSalaryString(
  usdString: string,
  country: CountryCode,
  level: ExperienceLevel = 'experienced'
): string {
  const parsed = parseUsdSalaryString(usdString);
  if (!parsed) return usdString;

  const info = getCountryInfo(country);

  // Split the original band into fresher half and experienced half
  const midpoint = (parsed.min + parsed.max) / 2;
  const usdRange =
    level === 'fresher'
      ? { min: parsed.min, max: midpoint }
      : { min: midpoint, max: parsed.max };

  const localMin = usdRange.min * info.marketMultiplier[level] * info.exchangeFromUSD;
  const localMax = usdRange.max * info.marketMultiplier[level] * info.exchangeFromUSD;

  switch (info.format) {
    case 'lpa': {
      const minL = Math.max(1, Math.round(localMin / 100000));
      const maxL = Math.max(1, Math.round(localMax / 100000));
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