'use client';
/** The newsletter box used at sign-in (unticked) and at checkout and FMR Club (pre-ticked, soft opt-in). */
export default function NewsletterCheckbox({
  checked,
  onChange,
  label,
  className = '',
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <label className={`flex items-start gap-2.5 text-sm text-secondary cursor-pointer ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border-border accent-[rgb(var(--color-brand))] cursor-pointer"
      />
      <span>{label}</span>
    </label>
  );
}
