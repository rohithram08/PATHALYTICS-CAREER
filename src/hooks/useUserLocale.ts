import { useState, useEffect } from 'react';
import { CountryCode, detectCountry } from '@/lib/locale';

const STORAGE_KEY = 'user_country_override';
const COUNTRY_CHANGE_EVENT = 'user-country-changed';

/** Safely try to read the auth context (works whether user is logged in or not) */
function useSafeAuth() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useAuth } = require('@/contexts/AuthContext');
    return useAuth();
  } catch {
    return null;
  }
}

export function useUserLocale() {
  const auth = useSafeAuth() as any;

  const user = auth?.user || auth?.profile || null;
  const phone =
    user?.phone || user?.mobile || user?.phoneNumber || user?.mobileNumber;
  const email = user?.email || user?.emailAddress;

  const [country, setCountryState] = useState<CountryCode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as CountryCode | null;
    if (stored) {
      console.log('🌍 Using stored country override:', stored);
      return stored;
    }
    return detectCountry({ phone, email, fallback: 'US' });
  });

  // 🔑 Subscribe to country changes from OTHER components / tabs
  useEffect(() => {
    // Same-tab updates (custom event dispatched by setCountry below)
    const handleCustom = (e: Event) => {
      const detail = (e as CustomEvent<CountryCode>).detail;
      if (detail) setCountryState(detail);
    };

    // Cross-tab updates (when localStorage changes in another tab)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        if (e.newValue) {
          setCountryState(e.newValue as CountryCode);
        } else {
          // Reset → re-detect
          setCountryState(detectCountry({ phone, email, fallback: 'US' }));
        }
      }
    };

    window.addEventListener(COUNTRY_CHANGE_EVENT, handleCustom);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(COUNTRY_CHANGE_EVENT, handleCustom);
      window.removeEventListener('storage', handleStorage);
    };
  }, [phone, email]);

  // Re-detect when user logs in / changes (only if no manual override)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as CountryCode | null;
    if (stored) return;
    const detected = detectCountry({ phone, email, fallback: 'US' });
    setCountryState((prev) => (prev !== detected ? detected : prev));
  }, [phone, email]);

  const setCountry = (code: CountryCode) => {
    localStorage.setItem(STORAGE_KEY, code);
    setCountryState(code);
    // 🔑 Notify every other useUserLocale() instance in the same tab
    window.dispatchEvent(
      new CustomEvent<CountryCode>(COUNTRY_CHANGE_EVENT, { detail: code })
    );
    console.log('🌍 Country manually set to:', code);
  };

  const resetCountry = () => {
    localStorage.removeItem(STORAGE_KEY);
    const detected = detectCountry({ phone, email, fallback: 'US' });
    setCountryState(detected);
    window.dispatchEvent(
      new CustomEvent<CountryCode>(COUNTRY_CHANGE_EVENT, { detail: detected })
    );
  };

  return { country, setCountry, resetCountry };
}