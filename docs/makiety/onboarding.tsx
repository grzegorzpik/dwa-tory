import React, { useState, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Check, Flame, Heart, Target, Calendar, User,
  BookOpen, Sparkles, Send, Camera, Image as ImageIcon, X,
} from "lucide-react";

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
    .font-display { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.04em; }
    .font-head { font-family: 'Fraunces', serif; }
    .font-body { font-family: 'Inter', sans-serif; }
    @keyframes rise { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
    .rise { animation: rise 0.25s ease; }
    button { font-family: inherit; }
  `}</style>
);

const C = {
  bg: "#12211D",
  surface: "#1B322B",
  surface2: "#213C33",
  line: "#2C4A40",
  gold: "#E3A542",
  a: "#E8724F",
  b: "#8AAE9E",
  text: "#F3EFE4",
  muted: "#9FB3AC",
};

function Chip({ label, selected, onClick, color }) {
  return (
    <button
      onClick={onClick}
      className="font-body text-[12px] px-3 py-1.5 rounded-full bg-transparent cursor-pointer"
      style={{ border: `1px solid ${selected ? (color || C.gold) : C.line}`, color: selected ? (color || C.gold) : C.muted }}
    >
      {label}
    </button>
  );
}

function TutorialPreview({ kind }) {
  if (kind === "dziennik") {
    return (
      <div className="rounded-2xl p-3" style={{ background: `linear-gradient(135deg, ${C.a}22, ${C.surface})`, border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between mb-2">
          <div className="w-6 h-6 rounded-full" style={{ background: C.a }} />
          <span className="font-body text-[10px] flex items-center gap-1" style={{ color: C.gold }}><Flame size={11} /> 12</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: C.a }} />
          <span className="font-body text-[11px]" style={{ color: C.text }}>Maraton treningowy</span>
        </div>
        <div className="rounded-lg py-2 text-center font-body text-[11px] font-semibold" style={{ background: C.a, color: "#15241F" }}>✓ Zrobione</div>
      </div>
    );
  }
  if (kind === "cele") {
    return (
      <div className="rounded-2xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full" style={{ background: C.a }} />
          <span className="font-body text-[11px]" style={{ color: C.text }}>Maraton treningowy</span>
        </div>
        <div className="flex items-center gap-1 mb-2">
          {[1, 1, 0, 0].map((f, i) => (
            <React.Fragment key={i}>
              <div className="rounded-[2px]" style={{ width: 8, height: 8, background: f ? C.a : C.surface2, border: `1px solid ${f ? C.a : C.line}` }} />
              {i < 3 && <div className="flex-1" style={{ height: 1.5, background: f ? C.a : C.line }} />}
            </React.Fragment>
          ))}
        </div>
        <div className="font-body text-[9px]" style={{ color: C.muted }}>2/4 kamieni</div>
      </div>
    );
  }
  if (kind === "kalendarz") {
    return (
      <div className="rounded-2xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
          {Array.from({ length: 21 }, (_, i) => (
            <div key={i} className="aspect-square rounded-[2px]" style={{ background: [3, 8, 14, 17].includes(i) ? C.a : C.surface2, opacity: [3, 8, 14, 17].includes(i) ? 1 : 0.6 }} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
      <div className="flex justify-between">
        {[["12", "seria"], ["19", "rekord"], ["6", "kamieni"]].map(([v, l]) => (
          <div key={l} className="text-center">
            <div className="font-display text-base" style={{ color: C.gold }}>{v}</div>
            <div className="font-body" style={{ fontSize: 8, color: C.muted }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const cropImageToDataUrl = (src, scale, offsetX, offsetY, frameSize, outputSize = 240) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext("2d");
      ctx.beginPath();
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      const ratio = outputSize / frameSize;
      const drawW = img.width * scale * ratio;
      const drawH = img.height * scale * ratio;
      const cx = outputSize / 2 + offsetX * ratio;
      const cy = outputSize / 2 + offsetY * ratio;
      ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = src;
  });

function PhotoCropper({ src, onConfirm, onCancel, initial }) {
  const [scale, setScale] = useState(initial?.scale || 1.3);
  const [pos, setPos] = useState({ x: initial?.x || 0, y: initial?.y || 0 });
  const dragRef = useRef(null);

  const onPointerDown = (e) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPos({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
  };
  const onPointerUp = () => { dragRef.current = null; };

  return (
    <div className="rise flex flex-col items-center">
      <div
        className="relative rounded-full overflow-hidden mb-4 cursor-grab"
        style={{ width: 180, height: 180, border: `2px solid ${C.gold}`, touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      </div>
      <div className="w-full flex items-center gap-3 mb-4">
        <span className="font-body text-[10px]" style={{ color: C.muted }}>Zoom</span>
        <input
          type="range" min="1" max="3" step="0.05"
          value={scale}
          onChange={(e) => setScale(parseFloat(e.target.value))}
          className="flex-1"
          style={{ accentColor: C.gold }}
        />
      </div>
      <div className="font-body text-[10px] mb-4" style={{ color: C.muted }}>Przeciągnij zdjęcie, żeby ustawić kadr.</div>
      <div className="flex gap-2 w-full">
        <button onClick={onCancel} className="flex-1 font-body text-xs py-2.5 rounded-xl bg-transparent cursor-pointer" style={{ border: `1px solid ${C.line}`, color: C.muted }}>
          Anuluj
        </button>
        <button onClick={() => onConfirm({ src, scale, x: pos.x, y: pos.y })} className="flex-1 font-body text-xs font-semibold py-2.5 rounded-xl cursor-pointer" style={{ background: C.gold, color: "#15241F" }}>
          Zatwierdź
        </button>
      </div>
    </div>
  );
}

function PhotoAvatar({ photo, size = 36, fallbackInitial = "?", fallbackColor = C.a }) {
  if (!photo) {
    return (
      <div className="rounded-full flex items-center justify-center font-head shrink-0" style={{ width: size, height: size, background: fallbackColor, color: "#15241F", fontSize: size * 0.4 }}>
        {fallbackInitial}
      </div>
    );
  }
  return (
    <div className="relative rounded-full overflow-hidden shrink-0" style={{ width: size, height: size }}>
      <img src={photo.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
}

const TUTORIAL_STEPS = [
  { key: "dziennik", icon: BookOpen, title: "Dziennik", text: "Codzienne odhaczanie — Twoje tory, jeden dotyk, bez rozklikiwania." },
  { key: "cele", icon: Target, title: "Cele", text: "Zakładanie i podgląd celów — typ, kolor, kamienie milowe na mapie." },
  { key: "kalendarz", icon: Calendar, title: "Kalendarz", text: "Tydzień albo miesiąc, Twój widok albo wspólny z partnerką." },
  { key: "profil", icon: User, title: "Profil", text: "Rekordy, Twoja podróż w czasie, i ustawienia całej aplikacji." },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState(null); // {src, scale, x, y}
  const [cropping, setCropping] = useState(null); // raw src while cropping
  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropping(reader.result);
    reader.readAsDataURL(file);
  };
  const [partnerCode, setPartnerCode] = useState("");
  const [inviteSent, setInviteSent] = useState(false);
  const [selfTimeChoice, setSelfTimeChoice] = useState(null);
  const [finished, setFinished] = useState(false);

  const totalSteps = 4 + 1 + TUTORIAL_STEPS.length + 1; // welcome, profil, partner, selftime, intro, 4x tutorial, finish
  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));

  const canProceed = () => {
    if (step === 1) return name.trim().length > 0;
    if (step === 3) return selfTimeChoice !== null;
    return true;
  };

  if (finished) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center py-8" style={{ background: "#0B1512" }}>
        <GlobalStyle />
        <div className="w-full max-w-sm rounded-[2.2rem] flex flex-col items-center justify-center text-center p-6" style={{ background: C.bg, border: `1px solid ${C.line}`, height: 820 }}>
          <h1 className="font-display text-3xl mb-2" style={{ color: C.text }}>DWA <span style={{ color: C.gold }}>TORY</span></h1>
          <p className="font-body text-xs" style={{ color: C.muted }}>Gotowe, {name || "cześć"}. Zaczynamy.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center py-8" style={{ background: "#0B1512" }}>
      <GlobalStyle />
      <div className="w-full max-w-sm rounded-[2.2rem] overflow-hidden flex flex-col" style={{ background: C.bg, border: `1px solid ${C.line}`, height: 820 }}>
        {step > 0 && (
          <div className="px-4 pt-5 pb-1">
            <div className="flex items-center gap-2">
              <button onClick={back} className="p-1 bg-transparent border-0 cursor-pointer" style={{ color: C.muted }}>
                <ChevronLeft size={20} />
              </button>
              <div className="flex-1 flex gap-1">
                {Array.from({ length: totalSteps - 1 }).map((_, i) => (
                  <div key={i} className="flex-1 rounded-full" style={{ height: 3, background: i <= step - 1 ? C.gold : C.line }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 pb-4 flex flex-col justify-center">
          {step === 0 && (
            <div className="rise flex flex-col items-center text-center">
              <h1 className="font-display text-4xl mb-3" style={{ color: C.text }}>DWA <span style={{ color: C.gold }}>TORY</span></h1>
            </div>
          )}

          {step === 1 && (
            <div className="rise">
              {cropping ? (
                <PhotoCropper
                  src={cropping}
                  initial={photo}
                  onCancel={() => setCropping(null)}
                  onConfirm={async (result) => {
                    try {
                      const croppedDataUrl = await cropImageToDataUrl(result.src, result.scale, result.x, result.y, 180);
                      setPhoto({ src: croppedDataUrl });
                    } catch (e) {
                      // przycięcie się nie powiodło — zostawiamy poprzedni stan
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
                    <PhotoAvatar photo={photo} size={52} fallbackInitial={name.trim() ? name.trim()[0].toUpperCase() : "?"} />
                    <div className="flex flex-col gap-2 flex-1">
                      <label className="font-body text-[11px] px-3 py-2 rounded-lg text-center cursor-pointer flex items-center justify-center gap-1.5" style={{ border: `1px solid ${C.line}`, color: C.text }}>
                        <Camera size={13} /> Zrób zdjęcie
                        <input type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
                      </label>
                      <label className="font-body text-[11px] px-3 py-2 rounded-lg text-center cursor-pointer flex items-center justify-center gap-1.5" style={{ border: `1px solid ${C.line}`, color: C.text }}>
                        <ImageIcon size={13} /> Wybierz z galerii
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
                      </label>
                    </div>
                  </div>
                  {photo && (
                    <button onClick={() => setCropping(photo.src)} className="font-body text-[10px] bg-transparent border-0 cursor-pointer" style={{ color: C.gold }}>
                      Popraw kadr
                    </button>
                  )}

                  {name.trim() && (
                    <div className="mt-5 flex items-center gap-2 rise">
                      <PhotoAvatar photo={photo} size={36} fallbackInitial={name.trim()[0].toUpperCase()} />
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
              {!inviteSent ? (
                <>
                  <button onClick={() => setInviteSent(true)} className="w-full font-body text-sm font-semibold py-3 rounded-xl cursor-pointer mb-3" style={{ background: C.gold, color: "#15241F" }}>
                    Wygeneruj zaproszenie
                  </button>
                  <div className="font-body text-[10px] mb-3" style={{ color: C.muted }}>albo, jeśli to Ty dołączasz</div>
                  <input
                    value={partnerCode}
                    onChange={(e) => setPartnerCode(e.target.value)}
                    placeholder="Wpisz kod od partnerki"
                    className="w-full font-body text-sm px-3 py-2.5 rounded-xl outline-none"
                    style={{ background: C.surface, color: C.text, border: `1px solid ${C.line}` }}
                  />
                </>
              ) : (
                <div className="rounded-2xl p-4 text-center rise" style={{ background: C.surface, border: `1px solid ${C.gold}` }}>
                  <div className="font-body text-[10px] mb-1" style={{ color: C.muted }}>Kod zaproszenia</div>
                  <div className="font-display text-2xl mb-2" style={{ color: C.gold, letterSpacing: "0.1em" }}>7K2M-9Q</div>
                  <div className="font-body text-[10px]" style={{ color: C.muted }}>Wyślij go Wioli — połączycie się, gdy go wpisze.</div>
                </div>
              )}
              <button onClick={next} className="w-full font-body text-[11px] mt-4 bg-transparent border-0 cursor-pointer" style={{ color: C.muted }}>
                Zrobię to później
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="rise">
              <div className="flex items-center gap-2 mb-2">
                <Heart size={16} style={{ color: C.gold }} />
                <div className="font-head text-base" style={{ color: C.text }}>Czas dla siebie</div>
              </div>
              <p className="font-body text-xs mb-4" style={{ color: C.muted }}>
                Możecie zaznaczać sobie nawzajem, gdy któreś z Was bierze trochę czasu tylko dla siebie — bez punktów, bez potwierdzania, tylko krótka informacja. Chcesz mieć tę funkcję włączoną?
              </p>
              <div className="flex gap-2">
                <Chip label="Tak, włącz" selected={selfTimeChoice === true} onClick={() => setSelfTimeChoice(true)} color={C.gold} />
                <Chip label="Nie teraz" selected={selfTimeChoice === false} onClick={() => setSelfTimeChoice(false)} color={C.gold} />
              </div>
              <div className="font-body text-[10px] mt-3" style={{ color: C.muted }}>Zawsze możesz to zmienić później w Profilu.</div>
            </div>
          )}

          {step === 4 && (
            <div className="rise flex flex-col items-center text-center">
              <Sparkles size={22} style={{ color: C.gold }} className="mb-4" />
              <h2 className="font-head text-xl mb-2" style={{ color: C.text }}>Teraz przejdźmy przez najważniejsze funkcje aplikacji</h2>
              <button onClick={() => setStep(totalSteps - 1)} className="font-body text-[11px] mt-3 bg-transparent border-0 cursor-pointer" style={{ color: C.muted }}>
                Pomiń samouczek
              </button>
              <div className="font-body text-[9px] mt-1" style={{ color: C.muted }}>Zawsze możesz go później uruchomić w Profilu → Ustawieniach.</div>
            </div>
          )}

          {step >= 5 && step < totalSteps - 1 && (() => {
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

          {step === totalSteps - 1 && (
            <div className="rise flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: `${C.gold}22`, border: `1.5px solid ${C.gold}` }}>
                <Check size={24} style={{ color: C.gold }} />
              </div>
              <h2 className="font-head text-xl mb-2" style={{ color: C.text }}>Gotowe, {name || "cześć"}</h2>
              <p className="font-body text-xs" style={{ color: C.muted }}>
                Dziennik czeka. Zacznij od jednego toru.
              </p>
            </div>
          )}
        </div>

        {!(step === 1 && cropping) && (
        <div className="px-6 pb-6 pt-2">
          <button
            onClick={() => (step === totalSteps - 1 ? setFinished(true) : next())}
            disabled={!canProceed()}
            className="w-full font-body text-sm font-semibold py-3 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
            style={{ background: canProceed() ? C.gold : C.surface2, color: canProceed() ? "#15241F" : C.muted, opacity: canProceed() ? 1 : 0.6 }}
          >
            {step === totalSteps - 1 ? "Zacznij" : step === 0 ? "Zaczynamy" : "Dalej"}
            {step < totalSteps - 1 && <ChevronRight size={16} />}
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
