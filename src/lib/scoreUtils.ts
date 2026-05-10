// src/lib/scoreUtils.ts
export interface ScoreMeta {
  color: string;
  bg: string;
  bar: string;
  border: string;
  label: string;
  emoji: string;
}

export const getScoreMeta = (score: number): ScoreMeta => {
  if (score >= 80)
    return {
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      bar: 'bg-emerald-500',
      border: 'border-emerald-500/30',
      label: 'Excellent',
      emoji: '🏆',
    };
  if (score >= 60)
    return {
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      bar: 'bg-blue-500',
      border: 'border-blue-500/30',
      label: 'Good',
      emoji: '👍',
    };
  if (score >= 40)
    return {
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      bar: 'bg-yellow-500',
      border: 'border-yellow-500/30',
      label: 'Partial',
      emoji: '📈',
    };
  return {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    bar: 'bg-red-500',
    border: 'border-red-500/30',
    label: 'Needs Work',
    emoji: '💪',
  };
};

export const getGrade = (s: number) => {
  if (s >= 90) return { grade: 'A+', label: 'Outstanding',   color: 'text-emerald-400' };
  if (s >= 80) return { grade: 'A',  label: 'Excellent',     color: 'text-emerald-400' };
  if (s >= 70) return { grade: 'B+', label: 'Very Good',     color: 'text-blue-400'    };
  if (s >= 60) return { grade: 'B',  label: 'Good',          color: 'text-blue-400'    };
  if (s >= 45) return { grade: 'C',  label: 'Fair',          color: 'text-yellow-400'  };
  return             { grade: 'D',  label: 'Needs Work',    color: 'text-red-400'     };
};

export const getReadiness = (avg: number) => {
  if (avg >= 80) return { text: 'Interview Ready',     color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
  if (avg >= 65) return { text: 'Almost There',        color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/30'       };
  if (avg >= 45) return { text: 'Keep Practicing',     color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/30'   };
  return               { text: 'More Practice Needed', color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30'         };
};