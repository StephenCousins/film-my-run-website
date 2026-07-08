import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import type { NewsletterPayload } from '@/lib/newsletter-template';
import NewsletterEditForm from '@/components/newsletter/NewsletterEditForm';

export const metadata: Metadata = {
  title: 'Review Draft',
  robots: { index: false, follow: false },
};

export default async function NewsletterEditPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const issue = await prisma.newsletter_issues.findUnique({
    where: { approve_token: token },
  });

  if (!issue) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold text-foreground mb-2">Draft not found</h1>
          <p className="text-secondary">This link is invalid or has expired.</p>
        </div>
      </main>
    );
  }

  if (issue.status === 'sent') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center max-w-md">
          <h1 className="font-display text-2xl font-semibold text-foreground mb-2">Already sent</h1>
          <p className="text-secondary">
            &ldquo;{issue.subject}&rdquo; was already sent to {issue.recipient_count} subscriber
            {issue.recipient_count === 1 ? '' : 's'} and can no longer be edited.
          </p>
        </div>
      </main>
    );
  }

  const payload = issue.content as unknown as NewsletterPayload;
  const approveUrl = `/api/newsletter/approve?token=${token}`;

  return (
    <main className="min-h-screen bg-background py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-2">Draft #{issue.id}</p>
          <h1 className="font-display text-3xl font-semibold text-foreground">Review this week&rsquo;s newsletter</h1>
          <p className="text-secondary mt-2">
            Edit anything below, then save. When you&rsquo;re happy, use the approve link to send it to all subscribers.
          </p>
        </div>
        <NewsletterEditForm token={token} initialPayload={payload} approveUrl={approveUrl} />
      </div>
    </main>
  );
}
