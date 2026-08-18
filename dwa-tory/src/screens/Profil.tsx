// Spec §5.7 — Profil. Podsumowanie, "Twoja podróż" (oś czasu per cel z
// liczonym postępem), Ustawienia (jeden wzorzec rozwijanych pozycji),
// eksport danych (domyka lukę ze spec §7).

import { useState } from 'react';
import {
  Bell,
  Camera,
  CalendarDays,
  Download,
  GraduationCap,
  Heart,
  Image as ImageIcon,
  Info,
  Users,
} from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { GoalJourney } from '../components/GoalJourney';
import { PhotoCropper } from '../components/PhotoCropper';
import { SelectChip } from '../components/SelectChip';
import { SettingsRow } from '../components/SettingsRow';
import { ToggleSwitch } from '../components/ToggleSwitch';
import { buildExportPayload, downloadJson } from '../lib/exportData';
import { milestonesFor } from '../lib/goals';
import { cropImageToDataUrl } from '../lib/photo';
import { useAppData } from '../store/AppDataContext';
import { C } from '../theme';

type RowKey = 'notifications' | 'account' | 'photo' | 'selfTime' | 'calendarView' | 'about' | 'tutorial';

export function Profil({ onOpenTutorial }: { onOpenTutorial: () => void }) {
  const { currentUser, partner, goals, settings, updateSettings, updateProfile } = useAppData();
  const milestonesReached = goals.reduce((sum, g) => sum + milestonesFor(g).filter((m) => m.done).length, 0);
  const [expanded, setExpanded] = useState<Set<RowKey>>(new Set());
  const [cropping, setCropping] = useState<string | null>(null); // surowy src podczas kadrowania

  const toggleRow = (key: RowKey) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropping(reader.result as string);
    reader.readAsDataURL(file);
  };

  const journeyGoals = goals.filter((g) => g.character !== 'habit');

  return (
    <div className="rise flex flex-col gap-5 pb-2">
      <div className="flex flex-col items-center text-center pt-4">
        <Avatar person={currentUser} size={64} />
        <div className="font-head text-lg mt-3" style={{ color: C.text }}>{currentUser.name}</div>
      </div>

      <div className="rounded-2xl p-3 flex justify-between" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        {[
          [String(currentUser.streak), 'seria'],
          [String(currentUser.longestStreak), 'rekord'],
          [String(milestonesReached), 'kamieni'],
        ].map(([v, l]) => (
          <div key={l} className="text-center flex-1">
            <div className="font-display text-lg" style={{ color: C.gold }}>{v}</div>
            <div className="font-body" style={{ fontSize: 10, color: C.muted }}>{l}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Twoja podróż</div>
        {journeyGoals.length === 0 ? (
          <div className="rounded-xl p-3 font-body text-[11px]" style={{ background: C.surface, border: `1px solid ${C.line}`, color: C.muted }}>
            Nawyki bez końca nie mają czego tu liczyć — podróż pojawi się, gdy dodasz cel z terminem albo etapami.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {journeyGoals.map((g) => (
              <GoalJourney key={g.id} goal={g} />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Ustawienia</div>
        <div className="flex flex-col gap-2">
          <SettingsRow icon={Bell} title="Powiadomienia" expanded={expanded.has('notifications')} onToggle={() => toggleRow('notifications')}>
            <div className="flex flex-col gap-2.5">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-body text-[11px]" style={{ color: C.text }}>Push</span>
                <ToggleSwitch checked={settings.pushEnabled} onChange={(v) => updateSettings({ pushEnabled: v })} />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-body text-[11px]" style={{ color: C.text }}>Dźwięk</span>
                <ToggleSwitch checked={settings.soundEnabled} onChange={(v) => updateSettings({ soundEnabled: v })} />
              </label>
              <div className="font-body text-[9px]" style={{ color: C.muted }}>
                Sam mechanizm powiadomień push dołączy w kroku 8/backendzie — tu zapisujemy tylko Twoją preferencję.
              </div>
            </div>
          </SettingsRow>

          <SettingsRow
            icon={Users}
            title="Konto i połączenie z partnerem"
            subtitle={partner ? `Połączono z ${partner.name}` : 'Brak połączenia'}
            expanded={expanded.has('account')}
            onToggle={() => toggleRow('account')}
          >
            {partner ? (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <Avatar person={partner} size={28} />
                  <div>
                    <div className="font-body text-[11px]" style={{ color: C.text }}>{partner.name}</div>
                    <div className="font-body text-[9px]" style={{ color: C.ok }}>Połączono</div>
                  </div>
                </div>
                <button
                  disabled
                  className="w-full font-body text-[11px] py-2 rounded-lg bg-transparent cursor-not-allowed"
                  style={{ border: `1px solid ${C.line}`, color: C.muted, opacity: 0.6 }}
                >
                  Rozłącz
                </button>
                <div className="font-body text-[9px]" style={{ color: C.muted }}>
                  Rozłączanie i parowanie kont wymagają backendu (krok 7) — status pokazany tu jest z lokalnych danych.
                </div>
              </div>
            ) : (
              <div className="font-body text-[10px]" style={{ color: C.muted }}>Łączenie z partnerką trafi tu razem z onboardingiem (krok 9).</div>
            )}
          </SettingsRow>

          <SettingsRow icon={Camera} title="Zdjęcie profilowe" expanded={expanded.has('photo')} onToggle={() => toggleRow('photo')}>
            {cropping ? (
              <PhotoCropper
                src={cropping}
                onCancel={() => setCropping(null)}
                onConfirm={async (result) => {
                  try {
                    const src = await cropImageToDataUrl(result.src, result.scale, result.x, result.y, 180);
                    updateProfile({ photo: { src } });
                  } catch (e) {
                    console.error('Nie udało się przyciąć zdjęcia', e);
                  }
                  setCropping(null);
                }}
              />
            ) : (
              <div className="flex items-center gap-3">
                <Avatar person={currentUser} size={44} />
                <div className="flex flex-col gap-2 flex-1">
                  <label className="font-body text-[11px] px-3 py-2 rounded-lg text-center cursor-pointer flex items-center justify-center gap-1.5" style={{ border: `1px solid ${C.line}`, color: C.text }}>
                    <Camera size={13} /> Zrób zdjęcie
                    <input type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                  </label>
                  <label className="font-body text-[11px] px-3 py-2 rounded-lg text-center cursor-pointer flex items-center justify-center gap-1.5" style={{ border: `1px solid ${C.line}`, color: C.text }}>
                    <ImageIcon size={13} /> Wybierz z galerii
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                  </label>
                </div>
              </div>
            )}
          </SettingsRow>

          <SettingsRow icon={Heart} title="Czas dla siebie" subtitle={settings.selfTimeEnabled ? 'Włączone' : 'Wyłączone'} expanded={expanded.has('selfTime')} onToggle={() => toggleRow('selfTime')}>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-body text-[11px]" style={{ color: C.text }}>Pokazuj w Dzienniku</span>
              <ToggleSwitch checked={settings.selfTimeEnabled} onChange={(v) => updateSettings({ selfTimeEnabled: v })} />
            </label>
          </SettingsRow>

          <SettingsRow icon={CalendarDays} title="Domyślny widok kalendarza" expanded={expanded.has('calendarView')} onToggle={() => toggleRow('calendarView')}>
            <div className="flex flex-col gap-3">
              <div>
                <div className="font-body text-[10px] mb-1.5" style={{ color: C.muted }}>Kto</div>
                <div className="flex gap-1.5 flex-wrap">
                  <SelectChip label="Mój" selected={settings.defaultCalendarView === 'mine'} onClick={() => updateSettings({ defaultCalendarView: 'mine' })} />
                  {partner && <SelectChip label={partner.name} selected={settings.defaultCalendarView === 'partner'} onClick={() => updateSettings({ defaultCalendarView: 'partner' })} />}
                  <SelectChip label="Wspólny" selected={settings.defaultCalendarView === 'both'} onClick={() => updateSettings({ defaultCalendarView: 'both' })} />
                </div>
              </div>
              <div>
                <div className="font-body text-[10px] mb-1.5" style={{ color: C.muted }}>Okres</div>
                <div className="flex gap-1.5">
                  <SelectChip label="Tydzień" selected={settings.defaultCalendarPeriod === 'week'} onClick={() => updateSettings({ defaultCalendarPeriod: 'week' })} />
                  <SelectChip label="Miesiąc" selected={settings.defaultCalendarPeriod === 'month'} onClick={() => updateSettings({ defaultCalendarPeriod: 'month' })} />
                </div>
              </div>
            </div>
          </SettingsRow>

          <SettingsRow icon={Info} title="O aplikacji" expanded={expanded.has('about')} onToggle={() => toggleRow('about')}>
            <div className="font-body text-[11px]" style={{ color: C.text }}>Dwa Tory</div>
            <div className="font-body text-[10px] mt-1" style={{ color: C.muted }}>
              Wersja rozwojowa — kroki 1–6 z 10 zrealizowane lokalnie (spec §10).
            </div>
          </SettingsRow>

          <SettingsRow icon={GraduationCap} title="Uruchom samouczek ponownie" expanded={false} onToggle={onOpenTutorial} />
        </div>
      </div>

      <div>
        <button
          onClick={() => downloadJson(buildExportPayload(currentUser, goals, settings), `dwa-tory-eksport-${currentUser.id}.json`)}
          className="w-full font-body text-[11px] py-2.5 rounded-xl flex items-center justify-center gap-1.5 bg-transparent cursor-pointer"
          style={{ border: `1px dashed ${C.line}`, color: C.muted, minHeight: 44 }}
        >
          <Download size={13} /> Eksportuj dane
        </button>
        <div className="font-body text-[9px] text-center mt-1.5" style={{ color: C.muted }}>
          Kopia Twoich celów i ustawień w formacie JSON.
        </div>
      </div>
    </div>
  );
}
