'use client';

import { motion } from 'framer-motion';

interface ParkrunStatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  highlight?: boolean;
}

export function ParkrunStatCard({
  label,
  value,
  subValue,
  icon,
  highlight = false,
}: ParkrunStatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative overflow-hidden rounded-2xl p-6
        ${highlight
          ? 'bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30'
          : 'bg-surface border border-border'
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted mb-1">{label}</p>
          <p className={`text-3xl font-bold font-mono ${highlight ? 'text-green-400' : 'text-foreground'}`}>
            {value}
          </p>
          {subValue && (
            <p className="text-xs text-muted mt-1">{subValue}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${highlight ? 'bg-green-500/20' : 'bg-surface-tertiary'}`}>
          {icon}
        </div>
      </div>

      {/* Decorative gradient */}
      <div
        className={`
          absolute -bottom-8 -right-8 w-24 h-24 rounded-full blur-2xl
          ${highlight ? 'bg-green-500/20' : 'bg-surface-tertiary/20'}
        `}
      />
    </motion.div>
  );
}

// Sub-stat for smaller secondary stats
interface SubStatProps {
  label: string;
  value: string | number;
}

export function SubStat({ label, value }: SubStatProps) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted uppercase tracking-wider">{label}</p>
      <p className="text-lg font-semibold text-secondary font-mono">{value}</p>
    </div>
  );
}
