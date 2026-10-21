import { useEffect, useState } from 'react';

export const VIEWS = ['ask', 'data', 'how'];

// The view lives in the hash (#/data, #/how) so it survives reloads and can be linked; ?demo stays in the query.
const read = () => {
  const view = window.location.hash.replace(/^#\/?/, '');
  return VIEWS.includes(view) ? view : 'ask';
};

export function useView() {
  const [view, setView] = useState(read);
  useEffect(() => {
    const onChange = () => setView(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const navigate = (next) => {
    window.location.hash = next === 'ask' ? '/' : `/${next}`;
    window.scrollTo(0, 0);
  };
  return [view, navigate];
}
