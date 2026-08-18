import { C } from '../theme';

/** Wspólny przełącznik on/off — Kreator (widoczność/sync) i Profil (ustawienia). */
export function ToggleSwitch({ checked, onChange, color }: { checked: boolean; onChange: (v: boolean) => void; color?: string }) {
  const accent = color ?? C.gold;
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative rounded-full border-0 cursor-pointer shrink-0"
      style={{ width: 36, height: 22, background: checked ? accent : C.line, padding: 2 }}
    >
      <span
        className="block rounded-full"
        style={{ width: 18, height: 18, background: '#15241F', transform: checked ? 'translateX(14px)' : 'translateX(0)', transition: 'transform 0.15s ease' }}
      />
    </button>
  );
}
