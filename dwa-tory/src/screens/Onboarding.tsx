// Spec §5.1 — pierwsze uruchomienie: imię+zdjęcie, połączenie z partnerką,
// czas dla siebie, samouczek (4 karty funkcji), ekran końcowy. Port
// docs/makiety/onboarding.tsx, dopasowany do realnych akcji AppDataContext
// (updateProfile/updateSettings zamiast window.storage z makiety) i do
// tego, że w tej appce partnerka jest już sparowana lokalnie (spec §7:
// prawdziwe parowanie kont wymaga backendu — krok 7, tu tylko status).

import { useEffect, useState } from 'react';
import { Camera, Check, ChevronLeft, ChevronRight, Copy, Heart, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { PhotoCropper } from '../components/PhotoCropper';
import { SelectChip } from '../components/SelectChip';
import { TutorialPreview } from '../components/TutorialPreview';
import { TUTORIAL_STEPS } from '../lib/tutorialSteps';
import { cropImageToDataUrl } from '../lib/photo';
import { CODE_TTL_MINUTES, createInviteCode, redeemInviteCode } from '../lib/pairing';
import { useAppData } from '../store/AppDataContext';
import { C } from '../theme';
import type { Photo } from '../types';

const TOTAL_STEPS = 4 + 1 + TUTORIAL_STEPS.length + 1; // powitanie, profil, partner, czas dla siebie, intro, 4x samouczek, koniec

export function Onboarding() {
  const { currentUser, partner, refreshPairing, updateProfile, updateSettings } = useAppData();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(currentUser?.name ?? '');
  const [photo, setPhoto] = useState<Photo | undefined>(currentUser?.photo);
  const [cropping, setCropping] = useState<string | null>(null);
  const [selfTimeChoice, setSelfTimeChoice] = useState<boolean | null>(null);

  // Parowanie — spec §5.1: "Wygeneruj kod" LUB pole na kod od partnerki, zawsze obie opcje naraz.
  const [myCode, setMyCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [enteredCode, setEnteredCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [pairError, setPairError] = useState('');
  const [copied, setCopied] = useState(false);

  const generateCode = async () => {
    setGenerating(true);
    setPairError('');
    try {
      setMyCode(await createInviteCode(currentUser.id));
    } catch (e) {
      setPairError(e instanceof Error ? e.message : 'Nie udało się wygenerować kodu.');
    } finally {
      setGenerating(false);
    }
  };

  const submitCode = async () => {
    if (!enteredCode.trim()) return;
    setRedeeming(true);
    setPairError('');
    try {
      await redeemInviteCode(enteredCode);
      setEnteredCode('');
      await refreshPairing();
    } catch (e) {
      setPairError(e instanceof Error ? e.message : 'Nie udało się połączyć.');
    } finally {
      setRedeeming(false);
    }
  };

  // Dopóki pokazujemy własny kod i nikt jeszcze go nie wpisał, sprawdzaj co
  // kilka sekund, czy partnerka już się połączyła — bez tego trzeba by
  // ręcznie odświeżać appkę (pełny Realtime dochodzi w Etapie 5).
  useEffect(() => {
    if (!myCode || partner) return;
    const id = setInterval(() => void refreshPairing(), 4000);
    return () => clearInterval(id);
  }, [myCode, partner, refreshPairing]);

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));

  const canProceed = () => {
    if (step === 1) return name.trim().length > 0;
    if (step === 3) return selfTimeChoice !== null;
    return true;
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropping(reader.result as string);
    reader.readAsDataURL(file);
  };

  const finish = () => {
    updateProfile({ name: name.trim(), photo });
    updateSettings({ selfTimeEnabled: selfTimeChoice ?? false, hasCompletedOnboarding: true });
  };

  const initial = name.trim() ? name.trim()[0].toUpperCase() : '?';

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {step > 0 && (
        <div className="px-6 pt-5 pb-1">
          <div className="flex items-center gap-2">
            <button onClick={back} className="p-1 bg-transparent border-0 cursor-pointer" style={{ color: C.muted, minWidth: 28, minHeight: 28 }} aria-label="Wstecz">
              <ChevronLeft size={20} />
            </button>
            <div className="flex-1 flex gap-1">
              {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => (
                <div key={i} className="flex-1 rounded-full" style={{ height: 3, background: i <= step - 1 ? C.gold : C.line }} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 pb-4 flex flex-col justify-center">
        {step === 0 && (
          <div className="rise flex flex-col items-center text-center">
            <h1 className="font-display text-4xl mb-3" style={{ color: C.text }}>
              DWA <span style={{ color: C.gold }}>TORY</span>
            </h1>
            <p className="font-body text-xs" style={{ color: C.muted }}>Świadome tory, dwie osoby, jeden rytm dnia.</p>
          </div>
        )}

        {step === 1 && (
          <div className="rise">
            {cropping ? (
              <PhotoCropper
                src={cropping}
                initial={photo ? { scale: 1.3, x: 0, y: 0 } : undefined}
                onCancel={() => setCropping(null)}
                onConfirm={async (result) => {
                  try {
                    const src = await cropImageToDataUrl(result.src, result.scale, result.x, result.y, 180);
                    setPhoto({ src });
                  } catch (e) {
                    console.error('Nie udało się przyciąć zdjęcia', e);
                  }
                  setCropping(null);
                }}
              />
            ) : (
              <>
                <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Jak masz na imię?</div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="np. Grzesiek"
                  autoFocus
                  className="w-full font-body text-sm px-3 py-2.5 rounded-xl outline-none mb-4"
                  style={{ background: C.surface, color: C.text, border: `1px solid ${C.line}` }}
                />

                <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Zdjęcie profilowe (opcjonalnie)</div>
                <div className="flex items-center gap-3 mb-2">
                  {photo ? (
                    <div className="relative rounded-full overflow-hidden shrink-0" style={{ width: 52, height: 52 }}>
                      <img src={photo.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div className="font-head flex items-center justify-center rounded-full font-semibold shrink-0" style={{ width: 52, height: 52, background: C.gold, color: '#15241F', fontSize: 20 }}>
                      {initial}
                    </div>
                  )}
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="font-body text-[11px] px-3 py-2 rounded-lg text-center cursor-pointer flex items-center justify-center gap-1.5" style={{ border: `1px solid ${C.line}`, color: C.text, minHeight: 44 }}>
                      <Camera size={13} /> Zrób zdjęcie
                      <input type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                    </label>
                    <label className="font-body text-[11px] px-3 py-2 rounded-lg text-center cursor-pointer flex items-center justify-center gap-1.5" style={{ border: `1px solid ${C.line}`, color: C.text, minHeight: 44 }}>
                      <ImageIcon size={13} /> Wybierz z galerii
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                    </label>
                  </div>
                </div>
                {photo && (
                  <button onClick={() => setCropping(photo.src)} className="font-body text-[10px] bg-transparent border-0 cursor-pointer" style={{ color: C.gold }}>
                    Popraw kadr
                  </button>
                )}

                {name.trim() && (
                  <div className="rise mt-5 flex items-center gap-2">
                    {photo ? (
                      <div className="relative rounded-full overflow-hidden shrink-0" style={{ width: 36, height: 36 }}>
                        <img src={photo.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div className="font-head flex items-center justify-center rounded-full font-semibold shrink-0" style={{ width: 36, height: 36, background: C.gold, color: '#15241F', fontSize: 14 }}>
                        {initial}
                      </div>
                    )}
                    <span className="font-body text-xs" style={{ color: C.text }}>Cześć, {name.trim()}!</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="rise">
            <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Połącz się z partnerką</div>
            {partner ? (
              <div className="rise rounded-2xl p-4 flex items-center gap-3" style={{ background: C.surface, border: `1px solid ${C.gold}` }}>
                <Avatar person={partner} size={40} />
                <div>
                  <div className="font-body text-xs" style={{ color: C.text }}>Połączono z {partner.name}</div>
                  <div className="font-body text-[10px]" style={{ color: C.muted }}>Widzicie nawzajem swoje tory — tyle, na ile pozwolicie.</div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="rounded-2xl p-3.5" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                  {myCode ? (
                    <div className="flex flex-col items-center text-center gap-1.5">
                      <div className="font-body text-[10px]" style={{ color: C.muted }}>Podaj partnerce ten kod (ważny {CODE_TTL_MINUTES} min):</div>
                      <div className="font-display text-3xl tracking-widest" style={{ color: C.gold }}>{myCode.code}</div>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(myCode.code).then(() => {
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                          });
                        }}
                        className="font-body text-[10px] bg-transparent border-0 cursor-pointer flex items-center gap-1"
                        style={{ color: C.muted, minHeight: 44 }}
                      >
                        <Copy size={11} /> {copied ? 'Skopiowano' : 'Kopiuj kod'}
                      </button>
                      <div className="font-body text-[10px]" style={{ color: C.muted }}>Czekamy, aż go wpisze…</div>
                    </div>
                  ) : (
                    <button
                      onClick={generateCode}
                      disabled={generating}
                      className="w-full font-body text-[11px] py-2.5 rounded-lg border-0 cursor-pointer"
                      style={{ background: C.gold, color: '#15241F', opacity: generating ? 0.6 : 1, minHeight: 44 }}
                    >
                      {generating ? 'Generuję…' : 'Wygeneruj kod'}
                    </button>
                  )}
                </div>

                <div className="font-body text-[10px] text-center" style={{ color: C.muted }}>albo</div>

                <div className="rounded-2xl p-3.5 flex flex-col gap-2" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                  <div className="font-body text-[10px]" style={{ color: C.muted }}>Masz kod od partnerki?</div>
                  <div className="flex gap-2">
                    <input
                      value={enteredCode}
                      onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
                      placeholder="np. AB3F7K"
                      maxLength={6}
                      className="flex-1 font-body text-sm px-3 py-2 rounded-lg outline-none tracking-widest"
                      style={{ background: C.bg, color: C.text, border: `1px solid ${C.line}` }}
                    />
                    <button
                      onClick={submitCode}
                      disabled={!enteredCode.trim() || redeeming}
                      className="font-body text-[11px] px-3 rounded-lg border-0 cursor-pointer"
                      style={{ background: C.gold, color: '#15241F', opacity: !enteredCode.trim() || redeeming ? 0.6 : 1, minWidth: 44, minHeight: 44 }}
                    >
                      {redeeming ? '…' : 'Połącz'}
                    </button>
                  </div>
                </div>

                {pairError && (
                  <div className="font-body text-[10px]" style={{ color: C.over }}>{pairError}</div>
                )}

                <div className="font-body text-[10px]" style={{ color: C.muted }}>Możesz to zrobić później — połączycie się w Profilu.</div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="rise">
            <div className="flex items-center gap-2 mb-2">
              <Heart size={16} style={{ color: C.gold }} />
              <div className="font-head text-base" style={{ color: C.text }}>Czas dla siebie</div>
            </div>
            <p className="font-body text-xs mb-4" style={{ color: C.muted }}>
              Możecie dawać sobie znać, gdy któreś z Was bierze chwilę tylko dla siebie — bez punktów, bez potwierdzania, tylko krótki sygnał. Włączyć tę funkcję?
            </p>
            <div className="flex gap-2">
              <SelectChip label="Tak, włącz" selected={selfTimeChoice === true} onClick={() => setSelfTimeChoice(true)} />
              <SelectChip label="Nie teraz" selected={selfTimeChoice === false} onClick={() => setSelfTimeChoice(false)} />
            </div>
            <div className="font-body text-[10px] mt-3" style={{ color: C.muted }}>Zawsze możesz to zmienić później w Profilu.</div>
          </div>
        )}

        {step === 4 && (
          <div className="rise flex flex-col items-center text-center">
            <Sparkles size={22} style={{ color: C.gold }} className="mb-4" />
            <h2 className="font-head text-xl mb-2" style={{ color: C.text }}>Pokażemy Ci najważniejsze funkcje aplikacji</h2>
            <button onClick={() => setStep(TOTAL_STEPS - 1)} className="font-body text-[11px] mt-3 bg-transparent border-0 cursor-pointer" style={{ color: C.muted }}>
              Pomiń samouczek
            </button>
            <div className="font-body text-[9px] mt-1" style={{ color: C.muted }}>Zawsze możesz go później uruchomić w Profilu → Ustawieniach.</div>
          </div>
        )}

        {step >= 5 &&
          step < TOTAL_STEPS - 1 &&
          (() => {
            const t = TUTORIAL_STEPS[step - 5];
            const Icon = t.icon;
            return (
              <div className="rise flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: `${C.gold}1f`, border: `1.5px solid ${C.gold}` }}>
                  <Icon size={22} style={{ color: C.gold }} />
                </div>
                <h2 className="font-head text-xl mb-2" style={{ color: C.text }}>{t.title}</h2>
                <p className="font-body text-xs mb-5" style={{ color: C.muted }}>{t.text}</p>
                <div className="w-full">
                  <TutorialPreview kind={t.key} />
                </div>
              </div>
            );
          })()}

        {step === TOTAL_STEPS - 1 && (
          <div className="rise flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: `${C.gold}22`, border: `1.5px solid ${C.gold}` }}>
              <Check size={24} style={{ color: C.gold }} />
            </div>
            <h2 className="font-head text-xl mb-2" style={{ color: C.text }}>Gotowe, {name.trim() || 'cześć'}</h2>
            <p className="font-body text-xs" style={{ color: C.muted }}>Dziennik czeka. Zacznij od jednego toru.</p>
          </div>
        )}
      </div>

      {!(step === 1 && cropping) && (
        <div className="px-6 pb-6 pt-2">
          <button
            onClick={() => (step === TOTAL_STEPS - 1 ? finish() : next())}
            disabled={!canProceed()}
            className="w-full font-body text-sm font-semibold py-3 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 border-0"
            style={{ background: canProceed() ? C.gold : C.surface2, color: canProceed() ? '#15241F' : C.muted, opacity: canProceed() ? 1 : 0.6, minHeight: 44 }}
          >
            {step === TOTAL_STEPS - 1 ? 'Zacznij' : step === 0 ? 'Zaczynamy' : 'Dalej'}
            {step < TOTAL_STEPS - 1 && <ChevronRight size={16} />}
          </button>
          {/* "Pomiń samouczek" istniało tylko na ekranie wprowadzającym (step 4) —
              raz w środku 4 kart samouczka (step 5+) nie dało się już pominąć reszty,
              trzeba było przejść każdą kartę po kolei (zgłoszenie audytu UX). */}
          {step >= 5 && step < TOTAL_STEPS - 1 && (
            <button
              onClick={() => setStep(TOTAL_STEPS - 1)}
              className="w-full font-body text-[11px] mt-2 bg-transparent border-0 cursor-pointer"
              style={{ color: C.muted, minHeight: 44 }}
            >
              Pomiń resztę samouczka
            </button>
          )}
        </div>
      )}
    </div>
  );
}
