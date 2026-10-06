import { motion } from 'framer-motion';

interface StatBlockProps {
  value: number;
  label: string;
  total?: number;
}

export default function StatBlock({ value, label, total }: StatBlockProps) {
  return (
    <motion.div
      className="text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="stat-numeral">
        {value}
        {total !== undefined && (
          <span className="text-lg text-muted font-normal"> / {total}</span>
        )}
      </div>
      <p className="text-xs text-muted mt-1 uppercase tracking-wider">{label}</p>
    </motion.div>
  );
}
