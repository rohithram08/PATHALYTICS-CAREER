import { Globe } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CountryCode } from '@/lib/locale';
import { useUserLocale } from '@/hooks/useUserLocale';

const COUNTRY_OPTIONS: { code: CountryCode; label: string; flag: string }[] = [
  { code: 'IN', label: 'India (₹)',          flag: '🇮🇳' },
  { code: 'US', label: 'USA ($)',            flag: '🇺🇸' },
  { code: 'GB', label: 'UK (£)',             flag: '🇬🇧' },
  { code: 'JP', label: 'Japan (¥)',          flag: '🇯🇵' },
  { code: 'DE', label: 'Germany (€)',        flag: '🇩🇪' },
  { code: 'FR', label: 'France (€)',         flag: '🇫🇷' },
  { code: 'AU', label: 'Australia (A$)',     flag: '🇦🇺' },
  { code: 'CA', label: 'Canada (C$)',        flag: '🇨🇦' },
  { code: 'SG', label: 'Singapore (S$)',     flag: '🇸🇬' },
  { code: 'AE', label: 'UAE (AED)',          flag: '🇦🇪' },
  { code: 'KR', label: 'S. Korea (₩)',       flag: '🇰🇷' },
  { code: 'CN', label: 'China (¥)',          flag: '🇨🇳' },
  { code: 'BR', label: 'Brazil (R$)',        flag: '🇧🇷' },
  { code: 'PH', label: 'Philippines (₱)',    flag: '🇵🇭' },
];

export const CountrySelector = ({ size = 'sm' }: { size?: 'sm' | 'default' }) => {
  const { country, setCountry } = useUserLocale();

  return (
    <Select value={country} onValueChange={(v) => setCountry(v as CountryCode)}>
      <SelectTrigger className={size === 'sm' ? 'h-9 w-[170px]' : 'w-[200px]'}>
        <Globe className="w-4 h-4 mr-1 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {COUNTRY_OPTIONS.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            <span className="mr-2">{c.flag}</span>
            {c.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};