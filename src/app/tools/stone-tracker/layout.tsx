import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'StoneTracker — UTMB Running Stones',
  alternates: { canonical: 'https://filmmyrun.co.uk/tools/stone-tracker' },
  description:
    'Instantly see how many UTMB Running Stones you have. Search your name, pick your profile, and StoneTracker works out your stones and whether your UTMB Index is valid for the Mont-Blanc lottery.',
  keywords: [
    'UTMB running stones',
    'UTMB stones checker',
    'UTMB lottery',
    'UTMB index',
    'how many running stones',
    'UTMB World Series',
  ],
  openGraph: {
    title: 'StoneTracker — UTMB Running Stones | Film My Run',
    description:
      'Search your name and instantly see your UTMB Running Stones and whether your UTMB Index is valid.',
  },
};

export default function StoneTrackerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
