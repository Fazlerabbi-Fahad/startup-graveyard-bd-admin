import { useEffect, useState } from 'react';

/** Resolve CSS custom properties to concrete values (SVG attributes can't use var()), re-reading on theme change. */
export function useCssVars(names) {
  const read = () => {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(`--${n}`).trim()]));
  };
  const [vars, setVars] = useState(read);
  useEffect(() => {
    const obs = new MutationObserver(() => setVars(read()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return vars;
}
