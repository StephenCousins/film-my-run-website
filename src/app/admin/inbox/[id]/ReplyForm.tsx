'use client';

import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-50 disabled:hover:scale-100">
      {pending ? 'Sending…' : 'Reply'}
    </button>
  );
}

export default function ReplyForm({
  action,
  email,
}: {
  action: (formData: FormData) => void;
  email: string;
}) {
  return (
    <form action={action} className="mt-6 space-y-3">
      <textarea
        name="text"
        required
        maxLength={5000}
        rows={5}
        className="input resize-none"
        placeholder="Write your reply…"
      />
      <div className="flex items-center justify-between gap-4">
        <a
          href={`mailto:${email}?subject=Re: your Film My Run question`}
          className="text-sm text-secondary hover:text-brand"
        >
          Reply by email instead
        </a>
        <SubmitButton />
      </div>
    </form>
  );
}
