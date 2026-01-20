'use client';

import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedDate?: string;
  category: 'milestone' | 'venue' | 'speed' | 'streak' | 'special';
}

interface AchievementBadgeProps {
  achievement: Achievement;
  index: number;
}

export function AchievementBadge({ achievement, index }: AchievementBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
      className={`
        relative p-4 rounded-xl text-center transition-all
        ${achievement.earned
          ? 'bg-zinc-900 border border-zinc-700 hover:border-green-500/50'
          : 'bg-zinc-900/50 border border-zinc-800/50 opacity-50'
        }
      `}
    >
      {/* Icon */}
      <div className={`
        text-3xl mb-2
        ${achievement.earned ? '' : 'grayscale'}
      `}>
        {achievement.earned ? achievement.icon : <Lock className="w-8 h-8 mx-auto text-zinc-600" />}
      </div>

      {/* Name */}
      <h4 className={`
        text-sm font-medium mb-1
        ${achievement.earned ? 'text-white' : 'text-zinc-500'}
      `}>
        {achievement.name}
      </h4>

      {/* Description */}
      <p className="text-xs text-zinc-500">{achievement.description}</p>

      {/* Earned date */}
      {achievement.earned && achievement.earnedDate && (
        <p className="text-xs text-green-500 mt-2">
          Earned {new Date(achievement.earnedDate).toLocaleDateString('en-GB', {
            month: 'short',
            year: 'numeric',
          })}
        </p>
      )}

      {/* Category indicator */}
      <div className={`
        absolute top-2 right-2 w-2 h-2 rounded-full
        ${achievement.category === 'milestone' ? 'bg-blue-500' :
          achievement.category === 'venue' ? 'bg-purple-500' :
          achievement.category === 'speed' ? 'bg-green-500' :
          achievement.category === 'streak' ? 'bg-amber-500' :
          'bg-pink-500'}
      `} />
    </motion.div>
  );
}

// PB Progression timeline
interface PBProgressionProps {
  pbs: { date: string; time_seconds: number; venue: string }[];
}

export function PBProgression({ pbs }: PBProgressionProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500 to-green-500/20" />

      <div className="space-y-4">
        {pbs.map((pb, index) => (
          <motion.div
            key={pb.date}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative pl-10"
          >
            {/* Dot */}
            <div className="absolute left-2 top-2 w-5 h-5 rounded-full bg-green-500 border-2 border-zinc-900 flex items-center justify-center">
              <span className="text-xs">🏆</span>
            </div>

            {/* Content */}
            <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-green-400 font-mono font-bold text-lg">
                  {formatTime(pb.time_seconds)}
                </span>
                <span className="text-xs text-zinc-500">
                  {new Date(pb.date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <p className="text-sm text-zinc-400">{pb.venue}</p>

              {/* Improvement from previous PB */}
              {index < pbs.length - 1 && (
                <p className="text-xs text-green-500 mt-1">
                  ⬇ {pbs[index + 1].time_seconds - pb.time_seconds}s faster
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Streak display
interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  longestStreakStart: string;
  longestStreakEnd: string;
}

export function StreakDisplay({
  currentStreak,
  longestStreak,
  longestStreakStart,
  longestStreakEnd,
}: StreakDisplayProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Current streak */}
      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
        <div className="text-center">
          <div className="text-4xl mb-2">🔥</div>
          <div className="text-3xl font-bold text-white font-mono">{currentStreak}</div>
          <p className="text-sm text-zinc-400 mt-1">
            {currentStreak === 1 ? 'week' : 'weeks'}
          </p>
          <p className="text-xs text-zinc-500 mt-2">Current streak</p>
        </div>
      </div>

      {/* Longest streak */}
      <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/5 rounded-xl p-4 border border-amber-500/30">
        <div className="text-center">
          <div className="text-4xl mb-2">⭐</div>
          <div className="text-3xl font-bold text-amber-400 font-mono">{longestStreak}</div>
          <p className="text-sm text-zinc-400 mt-1">
            {longestStreak === 1 ? 'week' : 'weeks'}
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            Best streak
            <br />
            <span className="text-amber-500/70">
              {new Date(longestStreakStart).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
              {' - '}
              {new Date(longestStreakEnd).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
