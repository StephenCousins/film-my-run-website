import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  alternates: { canonical: 'https://filmmyrun.com/contact' },
  description:
    'Get in touch for collaborations, sponsorships, media inquiries, or just to say hello. Based in the UK, available worldwide.',
  keywords: [
    'contact Film My Run',
    'race filming enquiry',
    'event coverage booking',
    'running filmmaker contact',
  ],
  openGraph: {
    title: 'Contact | Film My Run',
    description: 'Get in touch for collaborations, media inquiries, or to say hello.',
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
