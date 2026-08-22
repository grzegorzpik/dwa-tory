import { C } from '../theme';

/** Wspólny przełącznik on/off — Kreator (widoczność/sync) i Profil (ustawienia). */
export function ToggleSwitch({ checked, onChange, color }: { checked: boolean; onChange: (v: boolean) => void; color?: string }) {
  const accent = color ?? C.gold;
  return (
    // Sam wizualny tor jest 36×22 (celowo mały, zgodny z resztą appki), ale
    // realny obszar dotyku podniesiony do ~44px przez padding — ujemny margines
    // trzyma layout bez zmiany, ta sama sztuczka co przy przyciskach akcji
    // zadania w Dzienniku (zgłoszenie UX o zbyt małych celach dotykowych).
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative rounded-full border-0 cursor-pointer shrink-0 flex items-center"
      style={{ width: 36 + 16, height: 44, margin: '-11px -8px', padding: '0 8px', background: 'transparent' }}
    >
      <span className="relative rounded-full" style={{ width: 36, height: 22, background: checked ? accent : C.line, padding: 2, display: 'block' }}>
        <span
          className="block rounded-full"
          style={{ width: 18, height: 18, background: '#15241F', transform: checked ? 'translateX(14px)' : 'translateX(0)', transition: 'transform 0.15s ease' }}
        />
      </span>
    </button>
  );
}
