import type { GoalCharacter } from '../types';

/**
 * Kropka typu celu. Kolor koduje TYPE_COLOR (dwa tory = dwa kolory, spec
 * §2) — nawyk i "cel z etapami" dzielą ten sam zielony, bo oba mają
 * type="cykliczny". Żeby jednak dało się je odróżnić na pierwszy rzut oka
 * bez wprowadzania trzeciego akcentu (co złamałoby "dwa tory, dwa kolory"),
 * "cel z etapami" dostaje pierścień zamiast wypełnionego kółka — ten sam
 * motyw obrys/wypełnienie, którego już używa MiniTrack dla kamieni.
 */
export function GoalDot({ color, character, size = 8 }: { color: string; character: GoalCharacter; size?: number }) {
  const ringed = character === 'cyclicalContent';
  return (
    <div
      className="rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        background: ringed ? 'transparent' : color,
        border: ringed ? `1.5px solid ${color}` : 'none',
      }}
    />
  );
}
