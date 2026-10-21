import { ArrowIcon, SearchIcon } from './Icons';

const PLACEHOLDER = 'Ask about electrolytes, salts, solvents or Coulombic efficiency…';

// readOnly renders the text without an <input>, so the demo video can show typing with a steady caret.
export function QueryBox({ value, onChange, onSubmit, size = 'lg', readOnly = false, caret = false, pressed = false, busy = false, picker = null }) {
  const lg = size === 'lg';
  const submit = (event) => {
    event.preventDefault();
    if (value.trim() && !busy) onSubmit?.(value.trim());
  };
  const textClass = lg ? 'text-[18px]' : 'text-[15.5px]';
  return (
    <form
      onSubmit={submit}
      className={`glass ring-gradient relative z-30 flex items-center gap-3 rounded-2xl ${lg ? 'h-16 pl-5 pr-2' : 'h-12 pl-4 pr-1.5'}`}
    >
      <SearchIcon className={`${lg ? 'h-5 w-5' : 'h-4 w-4'} shrink-0 text-ink-400`} />
      {readOnly ? (
        <div className={`min-w-0 flex-1 truncate text-left ${textClass} text-ink-100`}>
          {value || <span className="text-ink-500">{PLACEHOLDER}</span>}
          {caret && <span className="ml-0.5 inline-block h-[1.15em] w-[2px] translate-y-[3px] bg-kg" />}
        </div>
      ) : (
        <input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={PLACEHOLDER}
          aria-label="Question"
          className={`min-w-0 flex-1 bg-transparent ${textClass} text-ink-100 placeholder:text-ink-500 focus:outline-none`}
        />
      )}
      {picker}
      <button
        type="submit"
        disabled={!value.trim() || busy}
        style={pressed ? { transform: 'scale(0.95)', filter: 'brightness(1.15)' } : undefined}
        className={`flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-kg via-solvent to-llm font-semibold text-ink-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 ${lg ? 'h-12 px-5 text-[14px]' : 'h-9 px-4 text-[13px]'}`}
      >
        Ask
        <ArrowIcon />
      </button>
    </form>
  );
}
