import { motion } from 'framer-motion';

interface StatBlockProps {
  value: number;
  label: string;
  total?: number;
}

export default function StatBlock({ value, label, total }: StatBlockProps) {
  const percentage = total ? Math.round((value / total) * 100) : 0;
  const isComplete = total ? value === total : false;

  return (
    <motion.div
      className="relative flex flex-col items-center justify-center p-4 text-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Glowing concentric background circle */}
      <div className="relative w-28 h-28 flex items-center justify-center mb-2">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background track */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth="6"
          />
          {/* Progress arc */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={isComplete ? '#10B981' : '#FF385C'}
            strokeWidth="6"
            strokeDasharray={264}
            strokeDashoffset={264 - (264 * percentage) / 100}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Inner number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tracking-tight text-white flex items-baseline">
            {value}
            {total !== undefined && (
              <span className="text-xs font-normal text-slate-400 ml-0.5">/{total}</span>
            )}
          </span>
          <span className="text-[10px] font-semibold text-slate-400">
            {percentage}%
          </span>
        </div>
      </div>

      <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{label}</p>
    </motion.div>
  );
}
