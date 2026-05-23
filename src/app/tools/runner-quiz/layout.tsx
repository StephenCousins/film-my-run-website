import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'What Kind of Runner Are You?',
  alternates: { canonical: 'https://filmmyrun.co.uk/tools/runner-quiz' },
  description:
    'Take the four-axis running ideology quiz. 32 questions across surface, method, distance, and spirit — find your running tribe in five minutes.',
  keywords: [
    'running quiz',
    'runner personality',
    'running tribe',
    'what kind of runner',
    'trail vs road',
    'running ideology',
  ],
  openGraph: {
    title: 'What Kind of Runner Are You? | Film My Run',
    description:
      '32 questions, 4 axes, 16 tribes. Find your running ideology in five minutes.',
  },
};

export default function RunnerQuizLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
