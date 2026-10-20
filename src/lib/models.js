// Model specs look like "provider:model-id", e.g. "anthropic:claude-opus-5-5".

export const providerOf = (spec) => (spec.includes(':') ? spec.slice(0, spec.indexOf(':')) : '');
export const modelId = (spec) => (spec.includes(':') ? spec.slice(spec.indexOf(':') + 1) : spec);

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// "claude-opus-5-5" → "Claude Opus 5.5", "gpt-4-turbo" → "GPT-4 Turbo"; anything else is shown as-is.
export function modelLabel(spec) {
  if (!spec) return '';
  const id = modelId(spec);
  if (id.startsWith('claude-')) {
    const [family, ...version] = id.slice('claude-'.length).split('-');
    return `Claude ${cap(family)}${version.length ? ` ${version.join('.')}` : ''}`;
  }
  if (id.startsWith('gpt-')) {
    return `GPT-${id
      .slice('gpt-'.length)
      .split('-')
      .map((part, i) => (i ? cap(part) : part))
      .join(' ')}`;
  }
  return id;
}

export const PROVIDER_NAMES = { openai: 'OpenAI', anthropic: 'Anthropic' };
