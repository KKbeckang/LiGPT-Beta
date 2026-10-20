import { enter } from '../lib/motion';
import { formatCE } from '../lib/electrolyte';
import { CheckIcon, DashIcon, ShieldIcon } from './Icons';

const STATUS = {
  confirmed: { className: 'border-kg/30 bg-kg/10 text-kg-soft', title: 'Value found in a retrieved passage', icon: <CheckIcon className="h-3 w-3" /> },
  cited: { className: 'border-salt/30 bg-salt/10 text-salt', title: 'Paper retrieved, value not in the passage', icon: <span className="font-mono text-[11px]">~</span> },
  missing: { className: 'border-white/10 bg-white/[0.02] text-ink-400', title: 'No passage from this paper was retrieved', icon: <DashIcon className="h-3 w-3" /> },
};

export function CrossCheck({ check, progress }) {
  return (
    <div style={enter(progress, 10)} className="glass flex items-center gap-4 rounded-2xl px-5 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-kg/25 to-llm/25 text-ink-100">
        <ShieldIcon />
      </span>
      <div className="leading-tight">
        <div className="text-[13.5px] font-semibold text-ink-100">Cross-check</div>
        <div className="text-[12px] text-ink-400">
          {check.confirmed} of {check.items.length} graph facts found in the retrieved passages
        </div>
      </div>
      <div className="ml-auto flex flex-wrap justify-end gap-2">
        {check.items.map((item, i) => {
          const s = STATUS[item.status];
          return (
            <span key={i} title={s.title} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] ${s.className}`}>
              {s.icon}
              Ref. {item.ref} · {formatCE(item.ce)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
