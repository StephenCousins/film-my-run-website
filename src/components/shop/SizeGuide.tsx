import type { SizeGuide as Guide } from '@/lib/shop';

/**
 * The supplier's chest measurements, folded away under the size picker.
 * A <details> rather than a modal: no state, and it opens without JavaScript.
 */
export default function SizeGuide({ guide }: { guide: Guide }) {
  return (
    <details className="mt-3 group">
      <summary className="text-sm text-brand hover:underline cursor-pointer list-none inline-flex items-center gap-1">
        Size guide
        <span aria-hidden className="text-muted transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="mt-3 rounded-xl border border-border bg-surface-secondary p-4">
        <p className="text-xs text-secondary mb-3">{guide.howTo}</p>
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="text-secondary text-left">
              <th scope="col" className="font-normal pb-2">Size</th>
              <th scope="col" className="font-normal pb-2">{guide.measure} (cm)</th>
              <th scope="col" className="font-normal pb-2">{guide.measure} (in)</th>
            </tr>
          </thead>
          <tbody>
            {guide.rows.map((r) => (
              <tr key={r.size} className="border-t border-border">
                <th scope="row" className="font-semibold text-foreground py-1.5 text-left">{r.size}</th>
                <td className="text-secondary py-1.5">{r.cm ?? '—'}</td>
                <td className="text-secondary py-1.5">{r.inch ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
