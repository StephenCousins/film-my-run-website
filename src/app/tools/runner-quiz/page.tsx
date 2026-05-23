import { Metadata } from 'next';
import QuizClient from './QuizClient';
import { findClosestIdeology } from './quiz-data';

interface Props {
  searchParams: Promise<{ r?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const r = params.r;

  if (r) {
    const parts = r.split('-').map(Number);
    if (parts.length === 4 && parts.every(n => !isNaN(n) && n >= 0 && n <= 100)) {
      const [surfaceL, methodL, distanceL, spiritL] = parts;
      const ideology = findClosestIdeology(surfaceL, methodL, distanceL, spiritL);
      const title = `I'm a ${ideology.name}! What Kind of Runner Are You?`;
      return {
        title,
        description: ideology.desc,
        openGraph: {
          title,
          description: ideology.desc,
          images: [`/tools/runner-quiz/og?r=${r}`],
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description: ideology.desc,
          images: [`/tools/runner-quiz/og?r=${r}`],
        },
      };
    }
  }

  return {
    title: 'What Kind of Runner Are You?',
    description: 'Take the four-axis running ideology quiz. 32 questions across surface, method, distance, and spirit — find your running tribe in five minutes.',
    openGraph: {
      title: 'What Kind of Runner Are You? | Film My Run',
      description: '32 questions, 4 axes, 21 tribes. Find your running ideology in five minutes.',
      images: ['/tools/runner-quiz/og'],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'What Kind of Runner Are You? | Film My Run',
      description: '32 questions, 4 axes, 21 tribes. Find your running ideology in five minutes.',
      images: ['/tools/runner-quiz/og'],
    },
  };
}

export default async function RunnerQuizPage({ searchParams }: Props) {
  const params = await searchParams;
  return <QuizClient sharedResult={params.r} />;
}
