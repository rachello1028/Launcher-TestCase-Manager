import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('launcher-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('launcher-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <button
      onClick={() => setDark(d => !d)}
      className="p-2 rounded-md text-fg-muted hover:bg-surface-3 hover:text-fg transition-colors"
      title={dark ? '切換淺色模式' : '切換深色模式'}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
