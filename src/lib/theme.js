import { useEffect, useState } from 'react';

const KEY = 'bdgy-admin:theme';
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

function read() {
  try {
    return localStorage.getItem(KEY) || 'system';
  } catch {
    return 'system';
  }
}

function apply(pref) {
  const dark = pref === 'dark' || (pref === 'system' && media().matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.setAttribute('data-color-mode', dark ? 'dark' : 'light');
}

/** 'light' | 'dark' | 'system' (default). Saved in localStorage. */
export function useTheme() {
  const [pref, setPref] = useState(read);

  useEffect(() => {
    apply(pref);
    try {
      if (pref === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, pref);
    } catch {
      /* storage unavailable: theme still applies for this session */
    }
    if (pref !== 'system') return undefined;
    const mq = media();
    const onChange = () => apply('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pref]);

  return [pref, setPref];
}
