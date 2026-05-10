import { useEffect, useRef, useState } from 'react';

interface Props {
  isActive: boolean;
}

export const UserMicVisualizer = ({ isActive }: Props) => {
  const [bars, setBars] = useState<number[]>(Array(20).fill(4));
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (isActive) {
      const animate = () => {
        setBars(
          Array.from({ length: 20 }, (_, i) =>
            i === 0 || i === 19
              ? 4
              : Math.random() * 32 + 4
          )
        );
        animRef.current = requestAnimationFrame(animate);
      };
      animRef.current = requestAnimationFrame(animate);
    } else {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      setBars(Array(20).fill(4));
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isActive]);

  return (
    <div className="flex items-center gap-[2px] h-10">
      {bars.map((h, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full transition-all duration-75 ${
            isActive ? 'bg-green-400' : 'bg-muted-foreground/30'
          }`}
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  );
};