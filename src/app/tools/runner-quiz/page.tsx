import { Metadata } from 'next';
import QuizClient from './QuizClient';
import { sharedType } from '@/lib/runner-quiz';

interface Props {
  searchParams: Promise<{ r?: string }>;
}

const DESCRIPTION =
  'Twelve situations, two minutes. Find out which of twelve runner types you are, from Fell Runner to Lab Rat, and see your Runner DNA.';

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { r } = await searchParams;
  const type = sharedType(r);
  const title = type ? `I'm a ${type.name}. What kind of runner are you?` : 'What Kind of Runner Are You?';
  const description = type ? `${type.line} ${DESCRIPTION}` : DESCRIPTION;
  const image = type ? `/tools/runner-quiz/og?r=${type.id}` : '/tools/runner-quiz/og';
  return {
    title,
    description,
    openGraph: { title, description, images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function RunnerQuizPage({ searchParams }: Props) {
  const { r } = await searchParams;
  return <QuizClient sharedResult={r} />;
}
