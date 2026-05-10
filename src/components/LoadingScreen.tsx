import { motion } from "framer-motion";

const PathalyticsLogo = () => (
  <svg
    width="80"
    height="80"
    viewBox="0 0 80 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Hexagon ring */}
    <line x1="40" y1="24" x2="53.86" y2="32" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="53.86" y1="32" x2="53.86" y2="48" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="53.86" y1="48" x2="40" y2="56" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="40" y1="56" x2="26.14" y2="48" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="26.14" y1="48" x2="26.14" y2="32" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="26.14" y1="32" x2="40" y2="24" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" />
    {/* Arms to outer nodes */}
    <line x1="40" y1="24" x2="40" y2="10" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="53.86" y1="32" x2="66" y2="25" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="53.86" y1="48" x2="66" y2="55" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="40" y1="56" x2="40" y2="70" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="26.14" y1="48" x2="14" y2="55" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="26.14" y1="32" x2="14" y2="25" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" />
    {/* Inner ring nodes */}
    <circle cx="40" cy="24" r="4" fill="#7C3AED" />
    <circle cx="53.86" cy="32" r="4" fill="#7C3AED" />
    <circle cx="53.86" cy="48" r="4" fill="#7C3AED" />
    <circle cx="40" cy="56" r="4" fill="#7C3AED" />
    <circle cx="26.14" cy="48" r="4" fill="#7C3AED" />
    <circle cx="26.14" cy="32" r="4" fill="#7C3AED" />
    {/* Outer nodes — staggered pulse via framer variants */}
    {([
      [40, 10], [66, 25], [66, 55], [40, 70], [14, 55], [14, 25],
    ] as [number, number][]).map(([cx, cy], i) => (
      // AFTER
      <motion.circle
        key={i}
        cx={cx}
        cy={cy}
        fill="#7C3AED"
        initial={{ r: 5.5, opacity: 1 }}
        animate={{ r: [5.5, 7, 5.5], opacity: [1, 0.7, 1] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          delay: i * 0.33,
          ease: "easeInOut",
        }}
      />
    ))}
  </svg>
);

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-6"
      >
        {/* Logo */}
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2"
        >
          <PathalyticsLogo />
          <span className="text-lg font-normal tracking-wide text-purple-600 dark:text-purple-400">
            Pathalytics
          </span>
        </motion.div>

        {/* Loading dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut",
              }}
              className="w-2 h-2 rounded-full bg-primary"
            />
          ))}
        </div>

        <p className="text-sm text-muted-foreground">Loading...</p>
      </motion.div>
    </div>
  );
};

export default LoadingScreen;