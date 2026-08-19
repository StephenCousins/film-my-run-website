import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RaceScript — turn your Strava run into a race report',
  alternates: { canonical: 'https://filmmyrun.com/tools/racescript' },
  description:
    'Paste a Strava activity, answer a few quick questions, and RaceScript writes your race report, blog post, or social caption — using your real run data, photos, gear and race-day weather.',
  keywords: [
    'race report generator',
    'Strava race report',
    'running blog generator',
    'AI race report',
    'running caption generator',
  ],
  openGraph: {
    title: 'RaceScript — turn your Strava run into a race report | Film My Run',
    description:
      'Paste a Strava activity and RaceScript writes your race report, blog, or social post from your real run data.',
  },
};

export default function RaceScriptLayout({ children }: { children: React.ReactNode }) {
  return children;
}
