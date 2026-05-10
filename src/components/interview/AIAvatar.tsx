import { useEffect, useRef } from 'react';
import { AvatarState } from '@/types/interview';
import { Mic, Brain, Volume2, Pause } from 'lucide-react';

interface Props {
  state: AvatarState;
  interviewerName?: string;
}

const stateConfig = {
  idle: {
    label: 'Ready',
    icon: Pause,
    ringColor: 'ring-border',
    glowColor: 'shadow-none',
    iconColor: 'text-muted-foreground',
    bgColor: 'bg-muted/30',
    pulseCount: 0,
  },
  speaking: {
    label: 'Speaking',
    icon: Volume2,
    ringColor: 'ring-primary',
    glowColor: 'shadow-[0_0_40px_rgba(99,102,241,0.4)]',
    iconColor: 'text-primary',
    bgColor: 'bg-primary/10',
    pulseCount: 3,
  },
  listening: {
    label: 'Listening',
    icon: Mic,
    ringColor: 'ring-green-500',
    glowColor: 'shadow-[0_0_40px_rgba(34,197,94,0.4)]',
    iconColor: 'text-green-400',
    bgColor: 'bg-green-500/10',
    pulseCount: 2,
  },
  thinking: {
    label: 'Thinking...',
    icon: Brain,
    ringColor: 'ring-yellow-500',
    glowColor: 'shadow-[0_0_40px_rgba(234,179,8,0.4)]',
    iconColor: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    pulseCount: 1,
  },
};

// ── Sound wave bars (shown when speaking/listening) ──────────────────────
const SoundWave = ({ active, color }: { active: boolean; color: string }) => (
  <div className="flex items-center gap-[3px] h-8">
    {[0.6, 1, 0.7, 1.2, 0.8, 1, 0.6, 0.9, 1.1, 0.7].map((h, i) => (
      <div
        key={i}
        className={`w-[3px] rounded-full transition-all ${color}`}
        style={{
          height: active ? `${h * 20}px` : '4px',
          animation: active ? `soundWave 0.8s ease-in-out ${i * 0.07}s infinite alternate` : 'none',
        }}
      />
    ))}
  </div>
);

// ── Thinking dots ────────────────────────────────────────────────────────
const ThinkingDots = () => (
  <div className="flex gap-1.5 items-center">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="w-2 h-2 rounded-full bg-yellow-400"
        style={{
          animation: `bounce 1s ease-in-out ${i * 0.2}s infinite`,
        }}
      />
    ))}
  </div>
);

export const AIAvatar = ({ state, interviewerName = 'Alex' }: Props) => {
  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Outer glow rings */}
      <div className="relative">
        {config.pulseCount > 0 && (
          <>
            {[...Array(config.pulseCount)].map((_, i) => (
              <div
                key={i}
                className={`absolute inset-0 rounded-full border-2 ${
                  state === 'speaking'  ? 'border-primary/30'   :
                  state === 'listening' ? 'border-green-500/30' :
                  'border-yellow-500/30'
                }`}
                style={{
                  animation: `ping ${1 + i * 0.4}s cubic-bezier(0,0,0.2,1) ${i * 0.3}s infinite`,
                  transform: `scale(${1 + i * 0.15})`,
                }}
              />
            ))}
          </>
        )}

        {/* Avatar circle */}
        <div
          className={`
            relative w-32 h-32 rounded-full flex items-center justify-center
            ring-4 transition-all duration-500
            ${config.ringColor} ${config.glowColor} ${config.bgColor}
          `}
        >
          {/* AI Face illustration */}
          <div className="relative w-20 h-20">
            {/* Head */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-600 flex items-center justify-center">
              {/* Eyes */}
              <div className="absolute top-5 flex gap-4">
                <div
                  className={`w-2.5 h-2.5 rounded-full bg-white transition-all duration-300 ${
                    state === 'thinking' ? 'w-2 h-2' : ''
                  }`}
                  style={{
                    animation: state === 'speaking' ? 'eyeBlink 3s ease-in-out infinite' : 'none',
                  }}
                />
                <div
                  className={`w-2.5 h-2.5 rounded-full bg-white transition-all duration-300 ${
                    state === 'thinking' ? 'w-2 h-2' : ''
                  }`}
                  style={{
                    animation: state === 'speaking' ? 'eyeBlink 3s ease-in-out 0.1s infinite' : 'none',
                  }}
                />
              </div>
              {/* Mouth */}
              <div className="absolute bottom-4 flex items-center justify-center">
                {state === 'speaking' ? (
                  <div className="flex gap-0.5 items-end">
                    {[2, 4, 3, 5, 2].map((h, i) => (
                      <div
                        key={i}
                        className="w-1 bg-white rounded-full"
                        style={{
                          height: `${h}px`,
                          animation: `mouthMove 0.3s ease-in-out ${i * 0.05}s infinite alternate`,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div
                    className={`w-6 h-1 rounded-full bg-white transition-all duration-300 ${
                      state === 'listening' ? 'bg-green-200' : ''
                    }`}
                  />
                )}
              </div>
            </div>
          </div>

          {/* State icon badge */}
          <div
            className={`
              absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-2 border-background
              flex items-center justify-center transition-all duration-300
              ${state === 'idle'      ? 'bg-muted' :
                state === 'speaking'  ? 'bg-primary' :
                state === 'listening' ? 'bg-green-500' :
                'bg-yellow-500'}
            `}
          >
            <Icon className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

      {/* Name + State */}
      <div className="text-center">
        <p className="font-bold text-foreground">{interviewerName}</p>
        <p className="text-xs text-muted-foreground">AI Interviewer</p>
        <div className="mt-2 flex items-center justify-center gap-2">
          {state === 'speaking'  && <SoundWave active color="bg-primary" />}
          {state === 'listening' && <SoundWave active color="bg-green-400" />}
          {state === 'thinking'  && <ThinkingDots />}
          {state === 'idle'      && (
            <span className="text-xs text-muted-foreground px-3 py-1 rounded-full bg-muted/50">
              Ready
            </span>
          )}
        </div>
      </div>

      {/* Global keyframe styles */}
      <style>{`
        @keyframes soundWave {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1); }
        }
        @keyframes eyeBlink {
          0%, 90%, 100% { transform: scaleY(1); }
          95%           { transform: scaleY(0.1); }
        }
        @keyframes mouthMove {
          from { transform: scaleY(0.5); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
};