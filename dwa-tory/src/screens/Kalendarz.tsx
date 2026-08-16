import { Calendar } from 'lucide-react';
import { ComingSoon } from '../components/ComingSoon';

export function Kalendarz() {
  return (
    <ComingSoon
      icon={Calendar}
      title="Kalendarz"
      text="Widok tygodnia/miesiąca, Wspólna seria i kamienie milowe trafią tu w kolejnym etapie budowy."
    />
  );
}
