import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Event Live Streaming',
  alternates: { canonical: 'https://filmmyrun.com/services/event-live-streaming' },
  description:
    'Professional live streaming for running events, trail races, and ultra-marathons. Multi-camera setups bringing race day to audiences worldwide in real time.',
  keywords: [
    'race live stream',
    'running event streaming',
    'live race coverage',
    'trail race live stream',
    'event broadcast',
  ],
  openGraph: {
    title: 'Event Live Streaming | Film My Run',
    description:
      'Professional live streaming for running events, trail races, and ultra-marathons.',
    images: [
      'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/og/event-live-streaming-og.jpg',
    ],
  },
};

export default function EventLiveStreamingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
