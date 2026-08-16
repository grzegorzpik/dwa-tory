import type { Person } from '../types';

export function Avatar({ person, size = 28 }: { person: Person; size?: number }) {
  if (person.photo) {
    return (
      <div className="relative rounded-full overflow-hidden shrink-0" style={{ width: size, height: size }}>
        <img src={person.photo.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }
  return (
    <div
      className="font-head flex items-center justify-center rounded-full font-semibold shrink-0"
      style={{ width: size, height: size, background: person.color, color: '#15241F', fontSize: size * 0.38 }}
    >
      {person.initials}
    </div>
  );
}
