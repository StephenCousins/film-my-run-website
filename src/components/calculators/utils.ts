// Shared calculator utilities

export function formatTime(hours: number, minutes: number, seconds: number): string {
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatTimeFromSeconds(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return formatTime(hours, minutes, seconds);
}

export function formatPace(secondsPerKm: number): string {
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.floor(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function getTimeInSeconds(hours: number, minutes: number, seconds: number): number {
  return hours * 3600 + minutes * 60 + seconds;
}

export function getVO2Classification(vo2: number): string {
  if (vo2 < 35) return 'Poor';
  if (vo2 < 45) return 'Fair';
  if (vo2 < 55) return 'Good';
  if (vo2 < 65) return 'Excellent';
  return 'Superior';
}

export function getAgeGradingClassification(percentage: number): string {
  if (percentage >= 100) return 'World Class';
  if (percentage >= 90) return 'National Class';
  if (percentage >= 80) return 'Regional Class';
  if (percentage >= 70) return 'Local Class';
  if (percentage >= 60) return 'Excellent';
  return 'Good';
}

export const standardDistances = [
  { label: '5K', value: 5, km: 5 },
  { label: '10K', value: 10, km: 10 },
  { label: 'Half Marathon', value: 21.0975, km: 21.0975 },
  { label: 'Marathon', value: 42.195, km: 42.195 },
  { label: '50K', value: 50, km: 50 },
  { label: '50 Miles', value: 80.4672, km: 80.4672 },
  { label: '100K', value: 100, km: 100 },
  { label: '100 Miles', value: 160.934, km: 160.934 },
];

export const ageGradingEvents = [
  { label: '100m', value: '100m' },
  { label: '200m', value: '200m' },
  { label: '400m', value: '400m' },
  { label: '800m', value: '800m' },
  { label: '1500m', value: '1500m' },
  { label: 'Mile', value: 'Mile' },
  { label: '3000m', value: '3000m' },
  { label: '5000m', value: '5000m' },
  { label: '10000m', value: '10000m' },
  { label: 'Half Marathon', value: 'Half Marathon' },
  { label: 'Marathon', value: 'Marathon' },
];
