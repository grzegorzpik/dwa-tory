import React, { useState, useRef, useEffect } from "react";
import {
  BookOpen,
  Target,
  Calendar,
  Flame,
  Check,
  Plus,
  AlertTriangle,
  CalendarClock,
  Info,
  X,
  Heart,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Bell,
  Send,
  Sparkles,
  User,
  Settings,
  Trophy,
  Camera,
  Image as ImageIcon,
  Zap,
  Repeat,
  Flag,
  Shield,
} from "lucide-react";

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
    .font-display { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.04em; }
    .font-head { font-family: 'Fraunces', serif; }
    .font-body { font-family: 'Inter', sans-serif; }
    @keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .rise { animation: rise 0.22s ease; }
    @keyframes pop { 0% { transform: scale(1); } 40% { transform: scale(1.3); } 100% { transform: scale(1); } }
    .pop { animation: pop 0.35s ease; }
    @keyframes flameBurst {
      0% { transform: scale(1); filter: drop-shadow(0 0 0px rgba(227,165,66,0)); }
      35% { transform: scale(1.6); filter: drop-shadow(0 0 6px rgba(227,165,66,0.9)); }
      100% { transform: scale(1); filter: drop-shadow(0 0 0px rgba(227,165,66,0)); }
    }
    .flame-burst { animation: flameBurst 0.6s ease; display: inline-flex; }
    @keyframes markerPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(227,165,66,0.5); }
      50% { box-shadow: 0 0 0 5px rgba(227,165,66,0); }
    }
    .marker-pulse { animation: markerPulse 1.8s ease-in-out infinite; }
    @keyframes sparkleFloat {
      0% { opacity: 0; transform: translateY(0) scale(0.6); }
      30% { opacity: 1; transform: translateY(-6px) scale(1); }
      100% { opacity: 0; transform: translateY(-18px) scale(0.7); }
    }
    .sparkle { position: absolute; animation: sparkleFloat 1.1s ease-out forwards; }
    @keyframes cardGlow {
      0% { box-shadow: 0 0 0 0 rgba(227,165,66,0.5); }
      100% { box-shadow: 0 0 0 3px rgba(227,165,66,0); }
    }
    .card-celebrate { animation: cardGlow 1s ease-out; }
    @keyframes bannerIn {
      0% { opacity: 0; transform: scale(0.9); }
      12% { opacity: 1; transform: scale(1.03); }
      20% { transform: scale(1); }
      85% { opacity: 1; }
      100% { opacity: 0; transform: scale(0.98); }
    }
    .milestone-banner { animation: bannerIn 3.4s ease; }
    @keyframes overlayFade {
      0% { opacity: 0; }
      10% { opacity: 1; }
      88% { opacity: 1; }
      100% { opacity: 0; }
    }
    .milestone-overlay { animation: overlayFade 3.4s ease; }
    @keyframes splashSequence {
      0% { opacity: 0; transform: scale(0.92); }
      18% { opacity: 1; transform: scale(1); }
      78% { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(1.02); }
    }
    .splash { animation: splashSequence 1.7s ease forwards; }
    @keyframes bigSparkle {
      0% { opacity: 0; transform: translateY(0) scale(0.5) rotate(0deg); }
      25% { opacity: 1; transform: translateY(-8px) scale(1.1) rotate(15deg); }
      100% { opacity: 0; transform: translateY(-22px) scale(0.8) rotate(30deg); }
    }
    .big-sparkle { position: absolute; animation: bigSparkle 1.6s ease-out forwards; }
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
  b: "#5FA8AE",
  text: "#F3EFE4",
  muted: "#9FB3AC",
  warn: "#E3A542",
  over: "#D9604E",
  ok: "#6FAE8C",
  skipped: "#5A6B65",
};

// kolor toru wynika z TYPU celu, nie z dowolnego wyboru per cel
const TYPE_COLOR = { termin: C.a, cykliczny: "#8AAE9E" };


const DAY_LABELS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const MONTH_NAMES = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
const MONTH_ABBR = { sty: 0, lut: 1, mar: 2, kwi: 3, maj: 4, cze: 5, lip: 6, sie: 7, wrz: 8, "paź": 9, lis: 10, gru: 11 };
const parseMilestoneDate = (dateStr) => {
  const [d, mAbbr] = dateStr.split(" ");
  return { day: parseInt(d, 10), month: MONTH_ABBR[mAbbr] };
};

// deterministic per-day state, keyed by real calendar date, so navigating months stays consistent
const dayState = (seed, year, month, day, consistency) => {
  let n = seed * 100000 + year * 1300 + month * 40 + day * 7;
  n = (n * 9301 + 49297) % 233280;
  const r = n / 233280;
  if (r < consistency.brak) return "brak";
  if (r < consistency.done) return "done";
  if (r < consistency.moved) return "moved";
  return "skipped";
};

const buildMonthGrid = (year, month, seed, consistency) => {
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
  const numDays = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= numDays; d++) cells.push({ day: d, state: dayState(seed, year, month, d, consistency) });
  while (cells.length < 42) cells.push(null);
  return cells;
};

const initialPeople = {
  a: {
    name: "Grzesiek",
    initials: "G",
    color: C.a,
    streak: 12,
    longestStreak: 19,
    cheers: 3,
    calSeed: 7,
    consistency: { brak: 0.08, done: 0.8, moved: 0.92 },
    goals: [
      {
        id: 1,
        title: "Maraton treningowy — 100 dni",
        type: "termin",
        cadenceLabel: "codziennie",
        cadenceSlots: ["Dziś", "Jutro"],
        start: "1 cze",
        deadline: "8 paź",
        milestones: [
          { id: 1, label: "Pierwsze 25 dni", date: "3 sie", threshold: 25 },
          { id: 2, label: "Połowa — dzień 50", date: "12 sie", threshold: 50 },
          { id: 3, label: "Dzień 75", date: "15 sie", threshold: 75 },
          { id: 4, label: "Meta — dzień 100", date: "8 paź", threshold: 100 },
        ],
        completedSessions: 74,
        instance: { curr: { status: "plan", note: "" }, next: { status: "plan", double: false } },
        rescheduleCount: 1,
      },
      {
        id: 10,
        title: "Czytanie wieczorne",
        type: "cykliczny",
        cadenceLabel: "codziennie",
        cadenceSlots: ["Dziś", "Jutro"],
        deadline: "co miesiąc",
        milestones: [],
        instance: { curr: { status: "plan", note: "" }, next: { status: "plan", double: false } },
        rescheduleCount: 0,
      },
    ],
  },
  b: {
    name: "Wiola",
    initials: "W",
    color: C.b,
    streak: 4,
    longestStreak: 6,
    cheers: 5,
    calSeed: 31,
    consistency: { brak: 0.22, done: 0.55, moved: 0.8 },
    goals: [
      {
        id: 2,
        title: "Kurs Excela",
        type: "cykliczny",
        cadenceLabel: "co tydzień",
        cadenceSlots: ["Ten tydzień", "Przyszły tydzień"],
        deadline: "co tydzień",
        milestones: [
          { id: 5, label: "Moduł 1: podstawy", date: "12 lip", done: true },
          { id: 6, label: "Moduł 2: tabele przestawne", date: "2 sie", done: true },
          { id: 7, label: "Moduł 3: makra", date: "12 sie", done: false },
          { id: 8, label: "Certyfikat końcowy", date: "13 wrz", done: false },
        ],
        instance: { curr: { status: "done", note: "Tabele przestawne — w końcu ogarnięte." }, next: { status: "plan", double: false } },
        rescheduleCount: 2,
      },
      {
        id: 3,
        title: "Czytanie — 1 książka / miesiąc",
        type: "cykliczny",
        cadenceLabel: "co miesiąc",
        deadline: "co miesiąc",
        milestones: [{ id: 9, label: "Rozdziały 1–6", date: "20 sie", done: false }],
        rescheduleCount: 0,
      },
    ],
  },
};

function SplashOverlay({ visible, onDone }) {
  if (!visible) return null;
  return (
    <div
      className="splash absolute inset-0 flex items-center justify-center"
      style={{ background: C.bg, zIndex: 60 }}
      onAnimationEnd={onDone}
    >
      <h1 className="font-display text-4xl" style={{ color: C.text }}>
        DWA <span style={{ color: C.gold }}>TORY</span>
      </h1>
    </div>
  );
}

function Avatar({ p, size = 28 }) {
  if (p.photo) {
    return (
      <div className="relative rounded-full overflow-hidden shrink-0" style={{ width: size, height: size }}>
        <img src={p.photo.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  return (
    <div className="font-head flex items-center justify-center rounded-full font-semibold shrink-0" style={{ width: size, height: size, background: p.color, color: "#15241F", fontSize: size * 0.38 }}>
      {p.initials}
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
    setPos({ x: dragRef.current.origX + (e.clientX - dragRef.current.startX), y: dragRef.current.origY + (e.clientY - dragRef.current.startY) });
  };
  const onPointerUp = () => { dragRef.current = null; };

  return (
    <div className="rise flex flex-col items-center">
      <div
        className="relative rounded-full overflow-hidden mb-4 cursor-grab"
        style={{ width: 160, height: 160, border: `2px solid ${C.gold}`, touchAction: "none" }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      >
        <img
          src={src} alt="" draggable={false}
          style={{ position: "absolute", top: "50%", left: "50%", transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${scale})`, userSelect: "none", pointerEvents: "none" }}
        />
      </div>
      <div className="w-full flex items-center gap-3 mb-3">
        <span className="font-body text-[10px]" style={{ color: C.muted }}>Zoom</span>
        <input type="range" min="1" max="3" step="0.05" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="flex-1" style={{ accentColor: C.gold }} />
      </div>
      <div className="flex gap-2 w-full">
        <button onClick={onCancel} className="flex-1 font-body text-xs py-2.5 rounded-xl bg-transparent cursor-pointer" style={{ border: `1px solid ${C.line}`, color: C.muted }}>Anuluj</button>
        <button onClick={() => onConfirm({ src, scale, x: pos.x, y: pos.y })} className="flex-1 font-body text-xs font-semibold py-2.5 rounded-xl cursor-pointer" style={{ background: C.gold, color: "#15241F" }}>Zatwierdź</button>
      </div>
    </div>
  );
}

function SectionTitle({ children, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-5">
      {Icon && <Icon size={16} style={{ color: C.gold }} />}
      <h2 className="font-head text-lg" style={{ color: C.text }}>{children}</h2>
    </div>
  );
}

// jeśli cel liczy sesje (np. dni maratonu), kamienie milowe wynikają z realnego postępu, nie z ręcznej flagi
const milestonesFor = (g) =>
  typeof g.completedSessions === "number"
    ? g.milestones.map((m) => ({ ...m, done: g.completedSessions >= m.threshold }))
    : g.milestones;

function MiniTrack({ g, color }) {
  const milestones = milestonesFor(g);
  const doneCount = milestones.filter((m) => m.done).length;
  const total = milestones.length;
  return (
    <div className="flex items-center px-0.5">
      {milestones.map((m, i) => (
        <React.Fragment key={m.id}>
          <div
            className={i === doneCount - 1 ? "marker-pulse" : ""}
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: m.done ? color : C.surface2,
              border: `1.5px solid ${m.done ? color : C.line}`,
              flexShrink: 0,
            }}
          />
          {i < total - 1 && (
            <div className="flex-1" style={{ height: 2, background: i < doneCount - 1 ? color : C.line }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function NgChoiceCard({ icon: Icon, title, desc, selected, onClick, color }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3 rounded-2xl text-left bg-transparent cursor-pointer"
      style={{ border: `1.5px solid ${selected ? (color || C.gold) : C.line}`, background: selected ? `${(color || C.gold)}14` : "transparent" }}
    >
      <Icon size={18} style={{ color: selected ? (color || C.gold) : C.muted, marginTop: 1 }} />
      <div className="min-w-0">
        <div className="font-body text-[13px] font-semibold" style={{ color: C.text }}>{title}</div>
        <div className="font-body text-[11px] mt-0.5" style={{ color: C.muted }}>{desc}</div>
      </div>
    </button>
  );
}

function NgChip({ label, selected, onClick, color }) {
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

const buildSimpleGrid = (year, month) => {
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const numDays = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= numDays; d++) cells.push(d);
  return cells;
};

function NgCalendarGrid({ year, month, onPrev, onNext, renderDay }) {
  const grid = buildSimpleGrid(year, month);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={onPrev} className="p-1 bg-transparent border-0 cursor-pointer" style={{ color: C.muted }}><ChevronLeft size={16} /></button>
        <span className="font-head text-sm" style={{ color: C.text }}>{MONTH_NAMES[month]} {year}</span>
        <button onClick={onNext} className="p-1 bg-transparent border-0 cursor-pointer" style={{ color: C.muted }}><ChevronRight size={16} /></button>
      </div>
      <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
        {DAY_LABELS.map((l) => <div key={l} className="text-center font-body" style={{ fontSize: 8, color: C.muted }}>{l}</div>)}
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
        {grid.map((d, i) => (d == null ? <div key={i} /> : renderDay(d, i)))}
      </div>
    </div>
  );
}

function DayChip({ label, inst, color }) {
  const styles = {
    plan: { border: `1.5px solid ${C.line}`, background: "transparent", text: C.muted },
    done: { border: `1.5px solid ${color}`, background: color, text: "#15241F" },
    moved: { border: `1.5px dashed ${C.gold}`, background: "transparent", text: C.gold },
    skipped: { border: `1.5px solid ${C.skipped}`, background: "transparent", text: C.skipped },
  };
  const s = styles[inst.status];
  return (
    <div className="rounded-lg px-2.5 py-1.5 font-body text-[11px] flex items-center gap-1" style={{ border: s.border, background: s.background, color: s.text }}>
      {label}{inst.double && <span className="font-display" style={{ fontSize: 10 }}>2×</span>}
    </div>
  );
}

export default function DwaToryFinal() {
  const [people, setPeople] = useState(initialPeople);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);

  // Wczytaj zapisany stan przy starcie (dane osobiste, nie współdzielone)
  useEffect(() => {
    (async () => {
      try {
        const savedPeople = await window.storage.get("dwa-tory-people", false);
        if (savedPeople?.value) setPeople(JSON.parse(savedPeople.value));
      } catch (e) {
        // brak zapisu — startujemy z danych domyślnych, to normalne przy pierwszym uruchomieniu
      }
      setStorageLoaded(true);
    })();
  }, []);

  // Zapisuj przy każdej zmianie — ale dopiero po wczytaniu startowym, żeby nie nadpisać zapisu pustym stanem początkowym
  useEffect(() => {
    if (!storageLoaded) return;
    window.storage.set("dwa-tory-people", JSON.stringify(people), false).catch(() => {});
  }, [people, storageLoaded]);

  const [tab, setTab] = useState("dziennik");
  const [conflict, setConflict] = useState(null);
  const [note, setNote] = useState({});
  const [poppedFor, setPoppedFor] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [noteOpen, setNoteOpen] = useState({});
  const [viewDate, setViewDate] = useState({ year: 2026, month: 7 }); // Sierpień 2026 — "dziś" w tej makiecie
  const today = { year: 2026, month: 7, day: 15 };

  const changeMonth = (delta) => {
    setViewDate((prev) => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m < 0) { m = 11; y -= 1; }
      if (m > 11) { m = 0; y += 1; }
      return { year: y, month: m };
    });
  };

  const primaryGoal = (who) => people[who].goals.find((g) => g.instance);
  const ownerOf = (goalId) => (people.a.goals.some((g) => g.id === goalId) ? "a" : "b");
  const goalById = (goalId) => { const who = ownerOf(goalId); return people[who].goals.find((g) => g.id === goalId); };
  const currentUser = "a"; // w realnej appce: zalogowany użytkownik
  const partner = currentUser === "a" ? "b" : "a";
  const MAX_WORDS = 5;
  const [screen, setScreen] = useState("app"); // "app" | "notifications"
  const [notifications, setNotifications] = useState([
    { id: 1, person: "b", text: "ukończyła: Kurs Excela", time: "dziś 14:32", responded: false, reply: "" },
    { id: 4, person: "b", text: "bierze dziś czas dla siebie (2h)", time: "dziś 09:10", responded: false, reply: "" },
    { id: 2, person: "b", text: "zdobyła kamień milowy: Moduł 2 — tabele przestawne", time: "wczoraj 19:05", responded: true, reply: "Brawo 👏" },
    { id: 3, person: "b", text: "ukończyła: Kurs Excela", time: "3 dni temu", responded: true, reply: "Super robota!" },
  ]);
  const [draftFor, setDraftFor] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const saved = await window.storage.get("dwa-tory-notifications", false);
        if (saved?.value) setNotifications(JSON.parse(saved.value));
      } catch (e) {
        // pierwsze uruchomienie — zostają domyślne przykładowe powiadomienia
      }
    })();
  }, []);
  useEffect(() => {
    if (!storageLoaded) return;
    window.storage.set("dwa-tory-notifications", JSON.stringify(notifications), false).catch(() => {});
  }, [notifications, storageLoaded]);

  const [showAllDone, setShowAllDone] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [calendarView, setCalendarView] = useState("mine"); // "mine" | "partner" | "both"
  const [viewType, setViewType] = useState("week"); // "week" | "month"
  const addDays = (ymd, n) => {
    const d = new Date(ymd.year, ymd.month, ymd.day);
    d.setDate(d.getDate() + n);
    return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
  };
  const [weekAnchor, setWeekAnchor] = useState(() => {
    const t = { year: 2026, month: 7, day: 15 };
    const dow = (new Date(t.year, t.month, t.day).getDay() + 6) % 7;
    return addDays(t, -dow);
  });
  const changeWeek = (delta) => setWeekAnchor((prev) => addDays(prev, delta * 7));
  const monthAbbr = (m) => MONTH_NAMES[m].slice(0, 3).toLowerCase();

  const goToTab = (id) => { setScreen("app"); setTab(id); };

  const touchStartY = useRef(null);
  const handlePanelTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const handlePanelTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const delta = e.changedTouches[0].clientY - touchStartY.current;
    if (delta < -40) setScreen("app"); // swipe up closes
    touchStartY.current = null;
  };

  const setDraft = (id, val) => {
    const words = val.trim().length ? val.trim().split(/\s+/) : [];
    if (words.length <= MAX_WORDS) setDraftFor((d) => ({ ...d, [id]: val }));
  };

  const sendReply = (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, responded: true, reply: draftFor[id] || "" } : n)));
  };


  const cheer = (who) => {
    setPeople((prev) => ({ ...prev, [who]: { ...prev[who], cheers: prev[who].cheers + 1 } }));
    setPoppedFor(who);
    setTimeout(() => setPoppedFor(null), 350);
  };

  const updateGoal = (who, goalId, patch) => {
    setPeople((prev) => ({
      ...prev,
      [who]: { ...prev[who], goals: prev[who].goals.map((g) => (g.id === goalId ? { ...g, ...patch } : g)) },
    }));
  };

  const [justCompleted, setJustCompleted] = useState({ a: false, b: false });
  const [celebrate, setCelebrate] = useState(false);
  const [croppingPhoto, setCroppingPhoto] = useState(null);
  const [openSetting, setOpenSetting] = useState(null); // null | "notif" | "account" | "about"
  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [partnerConnected, setPartnerConnected] = useState(true);
  const [reconnectCodeSent, setReconnectCodeSent] = useState(false);
  const [reconnectInput, setReconnectInput] = useState("");
  const handlePhotoFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCroppingPhoto(reader.result);
    reader.readAsDataURL(file);
  };
  const confirmPhoto = async (result) => {
    try {
      const croppedDataUrl = await cropImageToDataUrl(result.src, result.scale, result.x, result.y, 160);
      setPeople((prev) => ({ ...prev, [currentUser]: { ...prev[currentUser], photo: { src: croppedDataUrl } } }));
    } catch (e) {
      // przycięcie się nie powiodło — nie nadpisujemy istniejącego zdjęcia
    }
    setCroppingPhoto(null);
  };

  // --- Kreator nowego celu (otwierany z FAB) ---
  const [ngStep, setNgStep] = useState(0);
  const [ngKind, setNgKind] = useState(null); // "task" | "goal"
  const [ngName, setNgName] = useState("");
  const [ngReason, setNgReason] = useState("");
  const [ngCharacter, setNgCharacter] = useState(null); // "habit" | "termin" | "cyclicalContent"
  const [ngCalYear, setNgCalYear] = useState(2026);
  const [ngCalMonth, setNgCalMonth] = useState(7);
  const changeNgCalMonth = (delta) => {
    let m = ngCalMonth + delta, y = ngCalYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setNgCalMonth(m); setNgCalYear(y);
  };
  const [ngStartsToday, setNgStartsToday] = useState(true);
  const [ngStartDay, setNgStartDay] = useState(null);
  const [ngCadenceType, setNgCadenceType] = useState(null); // "daily" | "weekdays" | "perWeekCount" | "monthly"
  const [ngWeekdays, setNgWeekdays] = useState([]);
  const [ngPerWeekCount, setNgPerWeekCount] = useState(3);
  const [ngTimeOfDay, setNgTimeOfDay] = useState("");
  const [ngMonthDay, setNgMonthDay] = useState(null);
  const [ngAnchor, setNgAnchor] = useState("");
  const [ngMinimal, setNgMinimal] = useState("");
  const [ngMilestonePlan, setNgMilestonePlan] = useState(null); // "now" | "later"
  const [ngMilestoneTarget, setNgMilestoneTarget] = useState(4);
  const [ngTargetValue, setNgTargetValue] = useState("");
  const [ngTargetUnit, setNgTargetUnit] = useState("");
  const [ngMilestoneDates, setNgMilestoneDates] = useState([]); // [{day, month, year, label}]
  const [ngTaskDay, setNgTaskDay] = useState(null);
  const [ngTaskTime, setNgTaskTime] = useState("");
  const [ngEditMode, setNgEditMode] = useState(false);
  const [ngEditingGoalId, setNgEditingGoalId] = useState(null);
  const [ngConfirmDelete, setNgConfirmDelete] = useState(false);

  const ngTrackColor = ngCharacter === "habit" ? TYPE_COLOR.cykliczny : ngCharacter ? TYPE_COLOR[ngCharacter === "termin" ? "termin" : "cykliczny"] : C.gold;
  const ngIsTask = ngKind === "task";
  const ngNeedsMilestones = ngKind === "goal" && (ngCharacter === "termin" || ngCharacter === "cyclicalContent");
  const ngTotalSteps = ngIsTask ? 3 : 5 + (ngNeedsMilestones ? 1 : 0);

  const resetNewGoalForm = () => {
    setNgStep(0); setNgKind(null); setNgName(""); setNgReason(""); setNgCharacter(null);
    setNgCalYear(2026); setNgCalMonth(7); setNgStartsToday(true); setNgStartDay(null);
    setNgCadenceType(null); setNgWeekdays([]); setNgPerWeekCount(3); setNgTimeOfDay(""); setNgMonthDay(null); setNgAnchor("");
    setNgMinimal(""); setNgMilestonePlan(null); setNgMilestoneTarget(4); setNgTargetValue(""); setNgTargetUnit(""); setNgMilestoneDates([]);
    setNgTaskDay(null); setNgTaskTime("");
    setNgEditMode(false); setNgEditingGoalId(null); setNgConfirmDelete(false);
  };

  const startNewGoalScreen = () => { resetNewGoalForm(); setScreen("newGoal"); };

  const [ngConfirmExit, setNgConfirmExit] = useState(false);
  const ngHasData = ngName.trim().length > 0 || !!ngKind;
  const ngHandleBack = () => {
    if (ngStep === 0) {
      if (ngHasData && !ngEditMode) setNgConfirmExit(true);
      else { setScreen("app"); resetNewGoalForm(); }
    } else {
      setNgStep((s) => s - 1);
    }
  };

  const startEditGoal = (goal) => {
    resetNewGoalForm();
    setNgEditMode(true);
    setNgEditingGoalId(goal.id);
    setNgKind("goal");
    setNgName(goal.title);
    setNgReason(goal.reason || "");
    setNgCharacter(goal.type === "termin" ? "termin" : goal.milestones.length > 0 ? "cyclicalContent" : "habit");
    setNgAnchor(goal.anchor || "");
    setNgMinimal(goal.minimalVersion || "");
    if (goal.milestones.length > 0) {
      setNgMilestonePlan("now");
      setNgMilestoneTarget(goal.milestones.length);
      setNgMilestoneDates(goal.milestones.map((m) => {
        const parsed = parseMilestoneDate(m.date);
        return { day: parsed.day, month: parsed.month, year: 2026, label: m.label };
      }));
    } else {
      setNgMilestonePlan("later");
    }
    setScreen("newGoal");
  };

  const deleteGoal = (goalId) => {
    setPeople((prev) => ({ ...prev, [currentUser]: { ...prev[currentUser], goals: prev[currentUser].goals.filter((g) => g.id !== goalId) } }));
    setScreen("app");
    setTab("cele");
    resetNewGoalForm();
  };

  const ngToggleWeekday = (i) => setNgWeekdays((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  const ngToggleMilestoneDay = (d) => {
    setNgMilestoneDates((prev) => {
      const exists = prev.find((m) => m.day === d && m.month === ngCalMonth && m.year === ngCalYear);
      if (exists) return prev.filter((m) => !(m.day === d && m.month === ngCalMonth && m.year === ngCalYear));
      return [...prev, { day: d, month: ngCalMonth, year: ngCalYear, label: "" }].sort((a, b) => (a.year - b.year) || (a.month - b.month) || (a.day - b.day));
    });
  };
  const ngUpdateMilestoneLabel = (target, label) =>
    setNgMilestoneDates((prev) => prev.map((m) => (m.day === target.day && m.month === target.month && m.year === target.year ? { ...m, label } : m)));
  const ngRemoveMilestone = (target) =>
    setNgMilestoneDates((prev) => prev.filter((m) => !(m.day === target.day && m.month === target.month && m.year === target.year)));

  const ngCadenceLabel = () => {
    if (ngCadenceType === "daily") return "codziennie";
    if (ngCadenceType === "weekdays") return `${ngWeekdays.slice().sort((a, b) => a - b).map((i) => DAY_LABELS[i]).join(", ")}${ngTimeOfDay ? ` o ${ngTimeOfDay}` : ""}`;
    if (ngCadenceType === "perWeekCount") return `${ngPerWeekCount}× w tygodniu${ngTimeOfDay ? ` · ${ngTimeOfDay}` : ""}`;
    if (ngCadenceType === "monthly") return `co miesiąc, ${ngMonthDay ? `${ngMonthDay}. dnia` : "dzień nieustalony"}${ngTimeOfDay ? ` o ${ngTimeOfDay}` : ""}`;
    return "";
  };
  const ngSessionsPerMonth = () => {
    if (ngCadenceType === "daily") return 30;
    if (ngCadenceType === "weekdays") return ngWeekdays.length * 4.34;
    if (ngCadenceType === "perWeekCount") return ngPerWeekCount * 4.34;
    return 1;
  };
  const ngMinimalCap = Math.max(1, Math.round(ngSessionsPerMonth() * 0.25));

  const ngCanProceed = () => {
    if (ngStep === 0) return ngName.trim().length > 0 && !!ngKind && (ngKind === "task" || !!ngCharacter);
    if (ngIsTask) return true;
    if (ngStep === 1) {
      if (!ngCadenceType) return false;
      if (ngCadenceType === "weekdays") return ngWeekdays.length > 0;
      if (ngCadenceType === "monthly") return !!ngMonthDay;
      return true;
    }
    if (ngNeedsMilestoneStep(ngStep)) {
      if (!ngMilestonePlan) return false;
      if (ngMilestonePlan === "now") return ngMilestoneDates.length > 0;
    }
    return true;
  };
  const ngNeedsMilestoneStep = (s) => ngNeedsMilestones && s === 3;

  const submitNewGoal = () => {
    if (ngIsTask) {
      setScreen("app");
      setTab("cele");
      resetNewGoalForm();
      return;
    }
    const id = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newGoal = {
      id,
      title: ngName,
      type: ngCharacter === "habit" ? "cykliczny" : ngCharacter,
      cadenceLabel: ngCadenceLabel(),
      cadenceSlots: ngCadenceType === "perWeekCount" ? ["Ten tydzień", "Przyszły tydzień"] : ["Dziś", "Jutro"],
      start: ngStartsToday ? "dziś" : ngStartDay ? `${ngStartDay} ${MONTH_NAMES[ngCalMonth].slice(0, 3).toLowerCase()}` : "dziś",
      deadline: ngCadenceLabel(),
      reason: ngReason,
      anchor: ngAnchor,
      minimalVersion: ngMinimal,
      milestones: (() => {
        const targetNum = parseInt(ngTargetValue, 10) || ngMilestoneDates.length;
        let prevThreshold = 0;
        return ngMilestoneDates.map((m, i) => {
          const isLast = i === ngMilestoneDates.length - 1;
          let threshold;
          if (ngCharacter !== "termin") {
            threshold = undefined;
          } else if (isLast) {
            threshold = targetNum; // ostatni kamień zawsze równy realnemu celowi
          } else {
            const raw = Math.round(((i + 1) / ngMilestoneDates.length) * targetNum);
            threshold = Math.min(targetNum - 1, Math.max(prevThreshold + 1, raw)); // zawsze rosnąco, bez duplikatów
          }
          if (threshold !== undefined) prevThreshold = threshold;
          return {
            id: `${id}-m${i}`,
            label: m.label || `Etap ${i + 1}`,
            date: `${m.day} ${MONTH_NAMES[m.month].slice(0, 3).toLowerCase()}`,
            threshold,
          };
        });
      })(),
      ...(ngCharacter === "termin" ? { completedSessions: 0 } : {}),
      instance: { curr: { status: "plan", note: "" }, next: { status: "plan", double: false } },
      rescheduleCount: 0,
    };
    setPeople((prev) => {
      const goals = ngEditMode
        ? prev[currentUser].goals.map((g) => (g.id === ngEditingGoalId ? { ...newGoal, id: g.id, instance: g.instance, completedSessions: g.completedSessions ?? newGoal.completedSessions, rescheduleCount: g.rescheduleCount } : g))
        : [...prev[currentUser].goals, newGoal];
      return { ...prev, [currentUser]: { ...prev[currentUser], goals } };
    });
    setScreen("app");
    setTab("cele");
    resetNewGoalForm();
  };

  const [selfTime, setSelfTime] = useState({ active: false, duration: null });
  const [selfTimeEnabled, setSelfTimeEnabled] = useState(false); // pytanie z onboardingu — domyślnie off
  const [selfTimeLog, setSelfTimeLog] = useState([{ person: "b", day: 15, month: 7, duration: "2h" }]);
  const startSelfTime = (duration) => {
    setSelfTime({ active: true, duration });
    setSelfTimeLog((prev) => [...prev, { person: currentUser, day: today.day, month: today.month, duration }]);
  };
  const endSelfTime = () => setSelfTime({ active: false, duration: null });
  const wasAllDone = useRef(false);

  useEffect(() => {
    const goals = people[currentUser].goals.filter((g) => g.instance);
    const allDone = goals.length > 0 && goals.every((g) => g.instance.curr.status === "done");
    if (allDone && !wasAllDone.current) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 1100);
    }
    wasAllDone.current = allDone;
  }, [people, currentUser]);

  const [milestoneReached, setMilestoneReached] = useState(null);

  const markDone = (goalId) => {
    const who = ownerOf(goalId);
    const g = goalById(goalId);
    const newCount = typeof g.completedSessions === "number" ? g.completedSessions + 1 : null;
    const reached = newCount != null ? g.milestones.find((m) => m.threshold === newCount) : null;
    updateGoal(who, goalId, {
      instance: { ...g.instance, curr: { status: "done", note: note[goalId] || "" } },
      ...(newCount != null ? { completedSessions: newCount } : {}),
    });
    setPeople((prev) => ({ ...prev, [who]: { ...prev[who], streak: prev[who].streak + 1 } }));
    setJustCompleted((j) => ({ ...j, [who]: true }));
    setTimeout(() => setJustCompleted((j) => ({ ...j, [who]: false })), 600);
    if (reached) {
      setMilestoneReached({ label: reached.label, goalTitle: g.title, color: TYPE_COLOR[g.type] });
      setTimeout(() => setMilestoneReached(null), 3400);
    }
  };

  const undoDone = (goalId) => {
    const who = ownerOf(goalId);
    const g = goalById(goalId);
    updateGoal(who, goalId, {
      instance: { ...g.instance, curr: { status: "plan", note: "" } },
      ...(typeof g.completedSessions === "number" ? { completedSessions: Math.max(0, g.completedSessions - 1) } : {}),
    });
    setPeople((prev) => ({ ...prev, [who]: { ...prev[who], streak: Math.max(0, prev[who].streak - 1) } }));
  };

  const startMove = (goalId) => {
    const who = ownerOf(goalId);
    const g = goalById(goalId);
    if (g.instance.next.status === "plan") {
      setConflict(goalId);
    } else {
      updateGoal(who, goalId, { instance: { curr: { status: "moved" }, next: { status: "plan" } }, rescheduleCount: g.rescheduleCount + 1 });
    }
  };

  const resolveDoubleUp = (goalId) => {
    const who = ownerOf(goalId);
    const g = goalById(goalId);
    updateGoal(who, goalId, { instance: { curr: { status: "moved" }, next: { status: "plan", double: true } }, rescheduleCount: g.rescheduleCount + 1 });
    setConflict(null);
  };

  const resolveDrop = (goalId, which) => {
    const who = ownerOf(goalId);
    const g = goalById(goalId);
    const inst = which === "curr" ? { curr: { status: "skipped" }, next: g.instance.next } : { curr: { status: "moved" }, next: { status: "skipped" } };
    updateGoal(who, goalId, { instance: inst, rescheduleCount: g.rescheduleCount + 1 });
    setConflict(null);
  };

  const TabButton = ({ id, icon: Icon, label }) => (
    <button onClick={() => goToTab(id)} className="flex flex-col items-center gap-1 py-2 flex-1 font-body text-[11px]" style={{ color: screen === "app" && tab === id ? C.gold : C.muted }}>
      <Icon size={19} strokeWidth={screen === "app" && tab === id ? 2.4 : 1.8} />
      {label}
    </button>
  );

  if (!storageLoaded) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center py-8" style={{ background: "#0B1512" }}>
        <GlobalStyle />
        <div className="w-full max-w-sm rounded-[2.2rem] flex items-center justify-center" style={{ background: C.bg, border: `1px solid ${C.line}`, height: 820 }}>
          <span className="font-display text-xl" style={{ color: C.gold }}>DWA TORY</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center py-8" style={{ background: "#0B1512" }}>
      <GlobalStyle />
      <div className="w-full max-w-sm rounded-[2.2rem] overflow-hidden flex flex-col" style={{ background: C.bg, border: `1px solid ${C.line}`, height: 820, position: "relative" }}>
        {screen === "newGoal" ? (
          <>
            <div className="px-4 pt-5 pb-3">
              <div className="flex items-center gap-2 mb-3">
                <button onClick={ngHandleBack} className="p-1 bg-transparent border-0 cursor-pointer" style={{ color: C.muted }}>
                  <ChevronLeft size={20} />
                </button>
                <div className="flex-1 flex gap-1">
                  {Array.from({ length: ngTotalSteps }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => ngEditMode && setNgStep(i)}
                      disabled={!ngEditMode}
                      className="flex-1 rounded-full bg-transparent border-0 p-0"
                      style={{ height: 3, background: i <= ngStep ? ngTrackColor : C.line, cursor: ngEditMode ? "pointer" : "default" }}
                    />
                  ))}
                </div>
              </div>
              <h1 className="font-display text-2xl" style={{ color: C.text }}>{ngEditMode ? "EDYTUJ" : "NOWY"} <span style={{ color: C.gold }}>CEL</span></h1>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {ngConfirmExit ? (
                <div className="rise rounded-2xl p-4" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                  <div className="font-body text-xs mb-3" style={{ color: C.text }}>Porzucić wypełniony formularz? Nic się nie zapisze.</div>
                  <div className="flex gap-2">
                    <button onClick={() => { setScreen("app"); resetNewGoalForm(); }} className="flex-1 font-body text-[11px] py-2 rounded-lg cursor-pointer" style={{ background: "#D9604E", color: "#15241F" }}>
                      Tak, porzuć
                    </button>
                    <button onClick={() => setNgConfirmExit(false)} className="flex-1 font-body text-[11px] py-2 rounded-lg bg-transparent cursor-pointer" style={{ border: `1px solid ${C.line}`, color: C.muted }}>
                      Wróć do formularza
                    </button>
                  </div>
                </div>
              ) : (
              <>
              {ngStep === 0 && (
                <div className="rise flex flex-col gap-4">
                  <div>
                    <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Jak to nazwać?</div>
                    <input
                      value={ngName} onChange={(e) => setNgName(e.target.value)} placeholder="np. Codzienna medytacja" autoFocus
                      className="w-full font-body text-sm px-3 py-2.5 rounded-xl outline-none"
                      style={{ background: C.surface, color: C.text, border: `1px solid ${C.line}` }}
                    />
                  </div>
                  <div>
                    <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Dlaczego to robisz? (opcjonalnie)</div>
                    <input
                      value={ngReason} onChange={(e) => setNgReason(e.target.value)} placeholder="np. żeby mieć więcej energii dla Hani"
                      className="w-full font-body text-sm px-3 py-2.5 rounded-xl outline-none"
                      style={{ background: C.surface, color: C.text, border: `1px solid ${C.line}` }}
                    />
                  </div>
                  <div>
                    <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Co dodajesz?</div>
                    <div className="flex flex-col gap-2">
                      <NgChoiceCard icon={Zap} title="Szybkie zadanie" desc="Jednorazowe, bez śledzenia w czasie" selected={ngKind === "task"} onClick={() => setNgKind("task")} />
                      <NgChoiceCard icon={Target} title="Cel do śledzenia" desc="Będziesz do tego wracać — nawyk albo projekt" selected={ngKind === "goal"} onClick={() => setNgKind("goal")} />
                    </div>
                  </div>
                  {ngKind === "goal" && (
                    <div>
                      <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Charakter w czasie</div>
                      <div className="flex flex-col gap-2">
                        <NgChoiceCard icon={Repeat} color={TYPE_COLOR.cykliczny} title="Nawyk bez końca" desc="Liczy się regularność, nie ma mety" selected={ngCharacter === "habit"} onClick={() => setNgCharacter("habit")} />
                        <NgChoiceCard icon={Flag} color={TYPE_COLOR.termin} title="Cel z konkretnym targetem" desc="Ma liczbę i termin" selected={ngCharacter === "termin"} onClick={() => setNgCharacter("termin")} />
                        <NgChoiceCard icon={Target} color={TYPE_COLOR.cykliczny} title="Cel cykliczny z treścią" desc="Powtarza się, ale ma etapy" selected={ngCharacter === "cyclicalContent"} onClick={() => setNgCharacter("cyclicalContent")} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {ngIsTask && ngStep === 1 && (
                <div className="rise flex flex-col gap-4">
                  <div className="rounded-2xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                    <NgCalendarGrid
                      year={ngCalYear} month={ngCalMonth} onPrev={() => changeNgCalMonth(-1)} onNext={() => changeNgCalMonth(1)}
                      renderDay={(d) => (
                        <button
                          onClick={() => setNgTaskDay(ngTaskDay === d ? null : d)}
                          className="aspect-square rounded-md flex items-center justify-center font-body cursor-pointer"
                          style={{ fontSize: 10, background: ngTaskDay === d ? C.gold : "transparent", color: ngTaskDay === d ? "#15241F" : C.text, border: `1px solid ${ngTaskDay === d ? C.gold : C.line}` }}
                        >{d}</button>
                      )}
                    />
                  </div>
                  <input
                    value={ngTaskTime} onChange={(e) => setNgTaskTime(e.target.value)} placeholder="O której? np. 14:00 (opcjonalnie)"
                    className="w-full font-body text-sm px-3 py-2.5 rounded-xl outline-none"
                    style={{ background: C.surface, color: C.text, border: `1px solid ${C.line}` }}
                  />
                </div>
              )}

              {!ngIsTask && ngStep === 1 && (
                <div className="rise flex flex-col gap-4">
                  <div className="font-body text-[11px]" style={{ color: C.muted }}>Wzorzec powtarzalności</div>
                  <div className="flex gap-2 flex-wrap">
                    <NgChip label="Codziennie" selected={ngCadenceType === "daily"} onClick={() => setNgCadenceType("daily")} color={ngTrackColor} />
                    <NgChip label="Konkretne dni tygodnia" selected={ngCadenceType === "weekdays"} onClick={() => setNgCadenceType("weekdays")} color={ngTrackColor} />
                    <NgChip label="X razy w tygodniu" selected={ngCadenceType === "perWeekCount"} onClick={() => setNgCadenceType("perWeekCount")} color={ngTrackColor} />
                    <NgChip label="Co miesiąc" selected={ngCadenceType === "monthly"} onClick={() => setNgCadenceType("monthly")} color={ngTrackColor} />
                  </div>

                  {ngCadenceType === "weekdays" && (
                    <div className="rounded-xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                      <div className="flex gap-1.5 flex-wrap mb-3">
                        {DAY_LABELS.map((l, i) => (
                          <button key={l} onClick={() => ngToggleWeekday(i)} className="w-8 h-8 rounded-full font-body text-[11px] cursor-pointer"
                            style={{ background: ngWeekdays.includes(i) ? ngTrackColor : "transparent", color: ngWeekdays.includes(i) ? "#15241F" : C.muted, border: `1px solid ${ngWeekdays.includes(i) ? ngTrackColor : C.line}` }}>
                            {l}
                          </button>
                        ))}
                      </div>
                      <input value={ngTimeOfDay} onChange={(e) => setNgTimeOfDay(e.target.value)} placeholder="O której? np. 18:00 (opcjonalnie)"
                        className="w-full font-body text-xs px-2.5 py-2 rounded-lg outline-none" style={{ background: C.surface2, color: C.text, border: `1px solid ${C.line}` }} />
                    </div>
                  )}

                  {ngCadenceType === "perWeekCount" && (
                    <div className="rounded-xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-body text-xs" style={{ color: C.text }}>Razy w tygodniu</span>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setNgPerWeekCount((n) => Math.max(1, n - 1))} className="w-7 h-7 rounded-full bg-transparent cursor-pointer" style={{ border: `1px solid ${C.line}`, color: C.text }}>−</button>
                          <span className="font-display text-lg" style={{ color: ngTrackColor }}>{ngPerWeekCount}</span>
                          <button onClick={() => setNgPerWeekCount((n) => Math.min(7, n + 1))} className="w-7 h-7 rounded-full bg-transparent cursor-pointer" style={{ border: `1px solid ${C.line}`, color: C.text }}>+</button>
                        </div>
                      </div>
                      <input value={ngTimeOfDay} onChange={(e) => setNgTimeOfDay(e.target.value)} placeholder="Preferowana pora dnia (opcjonalnie)"
                        className="w-full font-body text-xs px-2.5 py-2 rounded-lg outline-none" style={{ background: C.surface2, color: C.text, border: `1px solid ${C.line}` }} />
                    </div>
                  )}

                  {ngCadenceType === "monthly" && (
                    <div className="rounded-xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                      <div className="font-body text-[10px] mb-2" style={{ color: C.muted }}>Którego dnia miesiąca?</div>
                      <div className="grid gap-1 mb-3" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <button key={d} onClick={() => setNgMonthDay(ngMonthDay === d ? null : d)} className="aspect-square rounded-md flex items-center justify-center font-body cursor-pointer"
                            style={{ fontSize: 9, background: ngMonthDay === d ? ngTrackColor : "transparent", color: ngMonthDay === d ? "#15241F" : C.text, border: `1px solid ${ngMonthDay === d ? ngTrackColor : C.line}` }}>
                            {d}
                          </button>
                        ))}
                      </div>
                      <input value={ngTimeOfDay} onChange={(e) => setNgTimeOfDay(e.target.value)} placeholder="O której? np. 18:00 (opcjonalnie)"
                        className="w-full font-body text-xs px-2.5 py-2 rounded-lg outline-none" style={{ background: C.surface2, color: C.text, border: `1px solid ${C.line}` }} />
                    </div>
                  )}

                  <div>
                    <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Kiedy zaczynasz?</div>
                    <div className="flex gap-2 mb-2">
                      <NgChip label="Dziś" selected={ngStartsToday} onClick={() => { setNgStartsToday(true); setNgStartDay(null); }} color={ngTrackColor} />
                      <NgChip label="Wybierz dzień" selected={!ngStartsToday} onClick={() => setNgStartsToday(false)} color={ngTrackColor} />
                    </div>
                    {!ngStartsToday && (
                      <div className="rounded-xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                        <NgCalendarGrid year={ngCalYear} month={ngCalMonth} onPrev={() => changeNgCalMonth(-1)} onNext={() => changeNgCalMonth(1)}
                          renderDay={(d) => (
                            <button onClick={() => setNgStartDay(ngStartDay === d ? null : d)} className="aspect-square rounded-md flex items-center justify-center font-body cursor-pointer"
                              style={{ fontSize: 10, background: ngStartDay === d ? ngTrackColor : "transparent", color: ngStartDay === d ? "#15241F" : C.text, border: `1px solid ${ngStartDay === d ? ngTrackColor : C.line}` }}>
                              {d}
                            </button>
                          )}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Po czym to zrobisz? (opcjonalnie)</div>
                    <input value={ngAnchor} onChange={(e) => setNgAnchor(e.target.value)} placeholder="np. po porannej kawie"
                      className="w-full font-body text-sm px-3 py-2.5 rounded-xl outline-none" style={{ background: C.surface, color: C.text, border: `1px solid ${C.line}` }} />
                  </div>
                </div>
              )}

              {!ngIsTask && ngStep === 2 && (
                <div className="rise flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Shield size={15} style={{ color: ngTrackColor }} />
                    <div className="font-body text-[11px]" style={{ color: C.muted }}>Wersja minimalna (opcjonalnie)</div>
                  </div>
                  <input value={ngMinimal} onChange={(e) => setNgMinimal(e.target.value)} placeholder="np. 1 pompka zamiast pełnego treningu"
                    className="w-full font-body text-sm px-3 py-2.5 rounded-xl outline-none" style={{ background: C.surface, color: C.text, border: `1px solid ${C.line}` }} />
                  {ngMinimal.trim() && ngCadenceType && (
                    <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: C.surface2, border: `1px solid ${ngTrackColor}55` }}>
                      <Shield size={13} style={{ color: ngTrackColor }} className="shrink-0" />
                      <span className="font-body text-[10px]" style={{ color: C.muted }}>
                        {ngCadenceType === "monthly" ? "Przy tej częstotliwości limit nie ma dużego znaczenia." : `Maksymalnie ${ngMinimalCap}× w miesiącu (25% dni).`}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {!ngIsTask && ngNeedsMilestoneStep(3) && (
                <div className="rise flex flex-col gap-4">
                  {ngCharacter === "termin" && (
                    <>
                      <div>
                        <div className="font-body text-[11px] mb-2" style={{ color: C.muted }}>Co mierzysz?</div>
                        <div className="flex gap-2">
                          <input value={ngTargetValue} onChange={(e) => setNgTargetValue(e.target.value.replace(/[^\d.]/g, ""))} placeholder="np. 100"
                            className="w-1/2 font-body text-sm px-3 py-2.5 rounded-xl outline-none" style={{ background: C.surface, color: C.text, border: `1px solid ${C.line}` }} />
                          <input value={ngTargetUnit} onChange={(e) => setNgTargetUnit(e.target.value)} placeholder="np. dni, kg, km"
                            className="w-1/2 font-body text-sm px-3 py-2.5 rounded-xl outline-none" style={{ background: C.surface, color: C.text, border: `1px solid ${C.line}` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-body text-[11px]" style={{ color: C.muted }}>Liczba kamieni</span>
                        <button onClick={() => setNgMilestoneTarget((n) => Math.max(1, n - 1))} className="w-7 h-7 rounded-full bg-transparent cursor-pointer" style={{ border: `1px solid ${C.line}`, color: C.text }}>−</button>
                        <span className="font-display text-lg" style={{ color: ngTrackColor }}>{ngMilestoneTarget}</span>
                        <button onClick={() => setNgMilestoneTarget((n) => Math.min(12, n + 1))} className="w-7 h-7 rounded-full bg-transparent cursor-pointer" style={{ border: `1px solid ${C.line}`, color: C.text }}>+</button>
                      </div>
                    </>
                  )}
                  <div className="flex flex-col gap-2">
                    <NgChoiceCard icon={Flag} title="Zaplanuj teraz na mapie" desc="Rozmieść etapy na kalendarzu" selected={ngMilestonePlan === "now"} onClick={() => setNgMilestonePlan("now")} color={ngTrackColor} />
                    <NgChoiceCard icon={Plus} title="Dodawaj po drodze" desc="Dopiszesz kolejny, gdy skończysz poprzedni" selected={ngMilestonePlan === "later"} onClick={() => setNgMilestonePlan("later")} color={ngTrackColor} />
                  </div>
                  {ngMilestonePlan === "now" && (
                    <>
                      <div className="rounded-2xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                        <div className="font-body text-[10px] mb-2" style={{ color: C.muted }}>Stuknij dzień, żeby dodać etap</div>
                        <NgCalendarGrid year={ngCalYear} month={ngCalMonth} onPrev={() => changeNgCalMonth(-1)} onNext={() => changeNgCalMonth(1)}
                          renderDay={(d) => {
                            const marked = ngMilestoneDates.some((m) => m.day === d && m.month === ngCalMonth && m.year === ngCalYear);
                            const atLimit = ngCharacter === "termin" && ngMilestoneDates.length >= ngMilestoneTarget && !marked;
                            return (
                              <button onClick={() => !atLimit && ngToggleMilestoneDay(d)} className="aspect-square rounded-md flex items-center justify-center font-body cursor-pointer"
                                style={{ fontSize: 10, background: marked ? ngTrackColor : "transparent", color: marked ? "#15241F" : atLimit ? C.line : C.text, border: `1px solid ${marked ? ngTrackColor : C.line}`, opacity: atLimit ? 0.5 : 1 }}>
                                {d}
                              </button>
                            );
                          }}
                        />
                      </div>
                      {ngMilestoneDates.length > 0 && (
                        <div className="flex flex-col gap-2">
                          {ngMilestoneDates.map((m) => (
                            <div key={`${m.year}-${m.month}-${m.day}`} className="flex gap-2 items-center">
                              <div className="font-display text-xs w-14 text-center shrink-0" style={{ color: ngTrackColor }}>{m.day} {MONTH_NAMES[m.month].slice(0, 3).toLowerCase()}</div>
                              <input value={m.label} onChange={(e) => ngUpdateMilestoneLabel(m, e.target.value)} placeholder="Nazwa etapu"
                                className="flex-1 font-body text-xs px-2.5 py-1.5 rounded-lg outline-none" style={{ background: C.surface, color: C.text, border: `1px solid ${C.line}` }} />
                              <button onClick={() => ngRemoveMilestone(m)} className="bg-transparent border-0 cursor-pointer p-2.5 -m-1.5" style={{ color: C.muted }}><X size={14} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {ngStep === ngTotalSteps - 1 && (
                <div className="rise flex flex-col gap-3">
                  <div className="font-body text-[11px] mb-1" style={{ color: C.muted }}>Podgląd</div>
                  <div className="rounded-2xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: ngTrackColor }} />
                      <span className="font-body text-xs" style={{ color: C.text }}>{ngName || "Bez nazwy"}</span>
                    </div>
                    <div className="font-body text-[10px]" style={{ color: C.muted }}>
                      {ngIsTask
                        ? `Szybkie zadanie${ngTaskDay ? ` · ${ngTaskDay} ${MONTH_NAMES[ngCalMonth].slice(0, 3).toLowerCase()}` : ""}${ngTaskTime ? ` · ${ngTaskTime}` : ""}`
                        : `${ngCharacter === "habit" ? "Nawyk" : ngCharacter === "termin" ? "Cel z terminem" : "Cel cykliczny"} · ${ngCadenceLabel()}${ngAnchor ? ` · po: ${ngAnchor}` : ""}`}
                    </div>
                    {!ngIsTask && ngCharacter === "termin" && ngTargetValue && (
                      <div className="font-body text-[10px] mt-1" style={{ color: C.muted }}>Cel: {ngTargetValue} {ngTargetUnit}</div>
                    )}
                    {!ngIsTask && (
                      <div className="font-body text-[10px] mt-1" style={{ color: C.muted }}>
                        Start: {ngStartsToday ? "dziś" : ngStartDay ? `${ngStartDay} ${MONTH_NAMES[ngCalMonth].slice(0, 3).toLowerCase()}` : "nieustalony"}
                      </div>
                    )}
                    {!ngIsTask && ngMinimal.trim() && (
                      <div className="font-body text-[10px] mt-1 flex items-center gap-1" style={{ color: ngTrackColor }}><Shield size={10} /> wersja minimalna: {ngMinimal}</div>
                    )}
                    {!ngIsTask && ngReason && <div className="font-body text-[10px] mt-1 italic" style={{ color: C.muted }}>„{ngReason}"</div>}
                  </div>
                  {!ngIsTask && (
                    <div className="rounded-xl p-3" style={{ background: C.surface2, border: `1px solid ${C.line}` }}>
                      <div className="font-body text-[10px]" style={{ color: C.muted }}>Pominięcie dnia jest w porządku — apka to uwzględnia i nie karze Cię za to.</div>
                    </div>
                  )}
                </div>
              )}
              </>
              )}
            </div>

            <div className="px-4 pb-5 pt-2">
              {!ngConfirmExit && ngEditMode && ngStep === ngTotalSteps - 1 && (
                <div className="mb-2">
                  {ngConfirmDelete ? (
                    <div className="flex gap-2">
                      <button onClick={() => deleteGoal(ngEditingGoalId)} className="flex-1 font-body text-[11px] py-2 rounded-lg cursor-pointer" style={{ background: "#D9604E", color: "#15241F" }}>
                        Tak, usuń
                      </button>
                      <button onClick={() => setNgConfirmDelete(false)} className="flex-1 font-body text-[11px] py-2 rounded-lg bg-transparent cursor-pointer" style={{ border: `1px solid ${C.line}`, color: C.muted }}>
                        Anuluj
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setNgConfirmDelete(true)} className="w-full font-body text-[11px] py-1 bg-transparent border-0 cursor-pointer" style={{ color: "#D9604E" }}>
                      Usuń cel
                    </button>
                  )}
                </div>
              )}
              {!ngConfirmExit && (
              <button
                onClick={() => (ngStep === ngTotalSteps - 1 ? submitNewGoal() : setNgStep((s) => s + 1))}
                disabled={!ngCanProceed()}
                className="w-full font-body text-sm font-semibold py-3 rounded-xl cursor-pointer"
                style={{ background: ngCanProceed() ? ngTrackColor : C.surface2, color: ngCanProceed() ? "#15241F" : C.muted, opacity: ngCanProceed() ? 1 : 0.6 }}
              >
                {ngStep === ngTotalSteps - 1 ? (ngEditMode ? "Zapisz zmiany" : "Dodaj cel") : "Dalej"}
              </button>
              )}
            </div>
          </>
        ) : (
          <>
        <div className="px-4 pt-6 pb-4 flex items-center justify-between">
          <h1 className="font-display text-3xl" style={{ color: C.text }}>DWA <span style={{ color: C.gold }}>TORY</span></h1>
          <div className="flex items-center gap-3">
            {tab === "dziennik" && (
              <span className="font-body text-[11px] flex items-center gap-1" style={{ color: C.gold }}>
                <Flame size={12} /> {people[currentUser].streak}
              </span>
            )}
            <button onClick={() => goToTab("profil")} className="bg-transparent border-0 cursor-pointer p-0">
              <Avatar p={people[currentUser]} size={30} />
            </button>
            <button onClick={() => setScreen((s) => (s === "notifications" ? "app" : "notifications"))} className="relative p-1.5 bg-transparent border-0 cursor-pointer">
              <Bell size={20} style={{ color: C.text }} />
              {notifications.some((n) => !n.responded) && (
                <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] px-[3px] rounded-full flex items-center justify-center font-body" style={{ background: C.gold, color: "#15241F", fontSize: 8 }}>
                  {notifications.filter((n) => !n.responded).length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 relative">
          <div
            className="absolute inset-0 overflow-y-auto px-4 pb-4"
            style={{
              background: C.bg,
              transform: screen === "notifications" ? "translateY(0)" : "translateY(-102%)",
              transition: "transform 0.3s ease",
              pointerEvents: screen === "notifications" ? "auto" : "none",
              zIndex: 20,
            }}
          >
            <div
              className="w-10 h-1 rounded-full mx-auto mt-1 mb-3"
              style={{ background: C.line, touchAction: "none" }}
              onTouchStart={handlePanelTouchStart}
              onTouchEnd={handlePanelTouchEnd}
            />
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-head text-lg" style={{ color: C.text }}>Powiadomienia</h2>
              <button onClick={() => setScreen("app")} className="flex items-center gap-1 font-body text-xs bg-transparent border-0 cursor-pointer" style={{ color: C.muted }}>
                <ChevronLeft size={15} className="rotate-90" /> zwiń
              </button>
            </div>
              <div className="flex flex-col gap-2">
                {notifications.map((n) => {
                  const person = people[n.person];
                  return (
                    <div key={n.id} className="rounded-2xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Avatar p={person} size={22} />
                        <span className="font-body text-[12px] flex-1 min-w-0" style={{ color: C.text }}>
                          <b>{person.name}</b> {n.text}
                        </span>
                      </div>
                      <div className="font-body text-[9px] mb-2" style={{ color: C.muted }}>{n.time}</div>

                      {n.responded ? (
                        <div className="font-body text-[11px] flex items-center gap-1.5" style={{ color: C.gold }}>
                          <Check size={12} /> Wysłano: „{n.reply}”
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-1.5 mb-2 flex-wrap">
                            {["Super robota!", "Dumny/a z Ciebie", "Brawo 👏", "Jesteś świetna"].map((chip) => (
                              <button key={chip} onClick={() => setDraft(n.id, chip)} className="font-body text-[10px] px-2 py-1 rounded-full bg-transparent cursor-pointer" style={{ color: C.muted, border: `1px solid ${C.line}` }}>
                                {chip}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2 items-center">
                            <input
                              value={draftFor[n.id] || ""}
                              onChange={(e) => setDraft(n.id, e.target.value)}
                              placeholder="Krótkie docenienie…"
                              className="flex-1 font-body text-xs px-2.5 py-1.5 rounded-lg outline-none"
                              style={{ background: C.surface2, color: C.text, border: `1px solid ${C.line}` }}
                            />
                            <button
                              onClick={() => sendReply(n.id)}
                              disabled={!(draftFor[n.id] || "").trim()}
                              className="p-2 rounded-lg flex items-center justify-center cursor-pointer"
                              style={{ background: (draftFor[n.id] || "").trim() ? C.gold : C.surface2, color: "#15241F", opacity: (draftFor[n.id] || "").trim() ? 1 : 0.5 }}
                            >
                              <Send size={14} />
                            </button>
                          </div>
                          <div className="font-body text-[9px] mt-1" style={{ color: C.muted }}>
                            {(draftFor[n.id] || "").trim() ? (draftFor[n.id] || "").trim().split(/\s+/).length : 0}/{MAX_WORDS} słów
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
          </div>

            {tab === "dziennik" && (
            <div className="rise">
              {(() => {
                const who = currentUser;
                const p = people[who];
                const streakAlpha = Math.min(48, p.streak * 3).toString(16).padStart(2, "0");
                const goalsWithInstance = p.goals.filter((g) => g.instance);
                const allDoneToday = goalsWithInstance.length > 0 && goalsWithInstance.every((g) => g.instance.curr.status === "done");
                return (
                  <div
                    className={`rounded-2xl p-3 mb-3 ${celebrate ? "card-celebrate" : ""}`}
                    style={{
                      background: `linear-gradient(135deg, ${p.color}${streakAlpha}, ${C.surface} 60%)`,
                      border: `1px solid ${allDoneToday ? C.gold : C.line}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-3 relative">
                      <Avatar p={p} size={22} />
                      <span className={`font-body text-[10px] flex items-center gap-0.5 shrink-0 ${justCompleted[who] ? "flame-burst" : ""}`} style={{ color: C.gold }}><Flame size={11} /> {p.streak}</span>
                      {celebrate && (
                        <>
                          <Sparkles size={10} className="sparkle" style={{ color: C.gold, right: 28, top: -2 }} />
                          <Sparkles size={8} className="sparkle" style={{ color: C.gold, right: 44, top: 4, animationDelay: "0.15s" }} />
                          <Sparkles size={9} className="sparkle" style={{ color: C.gold, right: 12, top: 6, animationDelay: "0.3s" }} />
                        </>
                      )}
                    </div>

                    <div className="flex flex-col gap-3">
                      {p.goals.filter((g) => g.instance).map((g, gi) => {
                        const showConflict = conflict === g.id;
                        const [labelCurr, labelNext] = g.cadenceSlots;
                        const trackColor = TYPE_COLOR[g.type];
                        return (
                          <div key={g.id} style={{ borderTop: gi > 0 ? `1px solid ${C.line}` : "none", paddingTop: gi > 0 ? 10 : 0 }}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: trackColor }} />
                              <span className="font-body text-[12px] truncate" style={{ color: C.text }}>{g.title}</span>
                              {g.milestones.length > 0 && (
                                <div className="flex-1 min-w-[24px]"><MiniTrack g={g} color={trackColor} /></div>
                              )}
                            </div>

                            <button
                              onClick={() => setExpanded((e) => ({ ...e, [g.id]: !e[g.id] }))}
                              className="w-full flex items-center gap-2 mb-2 bg-transparent border-0 p-0 text-left cursor-pointer"
                              style={{ font: "inherit" }}
                            >
                              <DayChip label={labelCurr} inst={g.instance.curr} color={trackColor} />
                              <div style={{ width: 12, height: 1, background: C.line }} />
                              <DayChip label={labelNext} inst={g.instance.next} color={trackColor} />
                              {g.instance.curr.note && (
                                <ChevronDown size={13} className="ml-auto transition-transform" style={{ color: C.muted, transform: expanded[g.id] ? "rotate(180deg)" : "none" }} />
                              )}
                            </button>

                            {expanded[g.id] && g.instance.curr.status === "done" && g.instance.curr.note && (
                              <div className="font-body text-[11px] italic mb-1 rise" style={{ color: C.muted }}>„{g.instance.curr.note}”</div>
                            )}

                            {g.instance.curr.status === "plan" && !showConflict && (
                              <div className="flex flex-col gap-2">
                                {noteOpen[g.id] && (
                                  <input
                                    value={note[g.id] || ""}
                                    onChange={(e) => setNote((n) => ({ ...n, [g.id]: e.target.value }))}
                                    placeholder="Notatka (opcjonalnie, tylko do wglądu)"
                                    autoFocus
                                    className="w-full font-body text-xs px-2.5 py-1.5 rounded-lg outline-none rise"
                                    style={{ background: C.surface2, color: C.text, border: `1px solid ${C.line}` }}
                                  />
                                )}
                                <div className="flex gap-2 items-stretch">
                                  <button onClick={() => markDone(g.id)} className="font-body text-sm font-semibold py-2.5 rounded-lg flex items-center justify-center gap-1.5" style={{ background: trackColor, color: "#15241F", flex: "3 1 0%" }}>
                                    <Check size={15} /> Zrobione
                                  </button>
                                  <button onClick={() => startMove(g.id)} className="font-body text-[10px] py-1 rounded-lg flex items-center justify-center gap-1 bg-transparent border-0 cursor-pointer" style={{ color: C.muted, font: "inherit", fontSize: 10, flex: "1 1 0%" }}>
                                    <CalendarClock size={11} /> przesuń
                                  </button>
                                </div>
                                {!noteOpen[g.id] && (
                                  <button onClick={() => setNoteOpen((n) => ({ ...n, [g.id]: true }))} className="font-body text-[10px] self-start bg-transparent border-0 p-0 cursor-pointer" style={{ color: C.muted, font: "inherit", fontSize: 10 }}>
                                    + notatka
                                  </button>
                                )}
                              </div>
                            )}

                            {showConflict && (
                              <div className="rounded-xl p-3 mt-1 rise" style={{ background: C.surface2, border: `1px solid ${C.gold}55` }}>
                                <div className="font-body text-[11px] flex items-start gap-1.5 mb-2" style={{ color: C.gold }}>
                                  <Info size={13} className="mt-0.5 shrink-0" /> {labelNext} masz już zaplanowane. Co zrobić?
                                </div>
                                <button onClick={() => resolveDoubleUp(g.id)} className="w-full font-body text-[11px] py-2 rounded-lg mb-1.5" style={{ background: trackColor, color: "#15241F" }}>
                                  Zrób oba naraz (2×)
                                </button>
                                <div className="flex gap-1.5">
                                  <button onClick={() => resolveDrop(g.id, "curr")} className="flex-1 font-body text-[11px] py-1.5 rounded-lg" style={{ border: `1px solid ${C.line}`, color: C.muted }}>Odpuść {labelCurr.toLowerCase()}</button>
                                  <button onClick={() => resolveDrop(g.id, "next")} className="flex-1 font-body text-[11px] py-1.5 rounded-lg" style={{ border: `1px solid ${C.line}`, color: C.muted }}>Odpuść {labelNext.toLowerCase()}</button>
                                </div>
                                <button onClick={() => setConflict(null)} className="w-full font-body text-[10px] py-1.5 mt-1 flex items-center justify-center gap-1" style={{ color: C.muted }}><X size={11} /> Anuluj</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {selfTimeEnabled && (
                      <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 10, marginTop: 4 }}>
                        {selfTime.active ? (
                          <div className="flex items-center justify-between">
                            <span className="font-body text-[11px] flex items-center gap-1.5" style={{ color: C.gold }}>
                              <Heart size={12} /> Czas dla siebie: {selfTime.duration}
                            </span>
                            <button onClick={endSelfTime} className="font-body text-[10px] bg-transparent border-0 cursor-pointer" style={{ color: C.muted }}>
                              zakończ
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-body text-[11px] mr-1" style={{ color: C.muted }}>Czas dla siebie:</span>
                            {["1h", "2h", "Wieczór"].map((d) => (
                              <button key={d} onClick={() => startSelfTime(d)} className="font-body text-[10px] px-2 py-1 rounded-full bg-transparent cursor-pointer" style={{ border: `1px solid ${C.line}`, color: C.muted }}>
                                {d}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {tab === "cele" && (
            <div className="rise">
              {(() => {
                const p = people[currentUser];
                return (
                  <div>
                    <div className="flex flex-col gap-2">
                      {p.goals.map((g) => {
                        const trackColor = TYPE_COLOR[g.type];
                        const doneCount = milestonesFor(g).filter((m) => m.done).length;
                        const showSuggestion = g.rescheduleCount >= 2;
                        return (
                          <div key={g.id} onClick={() => startEditGoal(g)} className="rounded-xl p-3 cursor-pointer flex items-start justify-between gap-2" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                            <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: trackColor }} />
                              <span className="font-body text-xs" style={{ color: C.text }}>{g.title}</span>
                            </div>
                            {g.milestones.length > 0 ? (
                              <>
                                <MiniTrack g={g} color={trackColor} />
                                <div className="font-body text-[10px] mt-1" style={{ color: C.muted }}>
                                  {doneCount}/{g.milestones.length} kamieni
                                </div>
                              </>
                            ) : (
                              <div className="font-body text-[10px]" style={{ color: C.muted }}>nawyk · {g.cadenceLabel}</div>
                            )}
                            {showSuggestion && (
                              <div className="font-body text-[10px] flex items-center gap-1.5 mt-1.5 pt-1.5" style={{ color: C.gold, borderTop: `1px solid ${C.line}` }}>
                                <AlertTriangle size={11} className="shrink-0" />
                                {g.rescheduleCount}× przesunięte — sprawdź tempo
                              </div>
                            )}
                            </div>
                            <ChevronRight size={15} style={{ color: C.muted }} className="shrink-0 mt-0.5" />
                          </div>
                        );
                      })}
                    </div>
                    <button onClick={startNewGoalScreen} className="mt-2 w-full font-body text-[11px] py-2 rounded-lg flex items-center justify-center gap-1 bg-transparent cursor-pointer" style={{ border: `1px dashed ${C.line}`, color: C.muted }}>
                      <Plus size={13} /> Nowy cel
                    </button>
                  </div>
                );
              })()}
            </div>
          )}

          {tab === "kalendarz" && (
            <div className="rise">
              {(() => {
                const p = people[currentUser];
                const partnerP = people[partner];
                const viewedIds = calendarView === "both" ? [currentUser, partner] : calendarView === "partner" ? [partner] : [currentUser];

                const milestonesOf = (who) =>
                  people[who].goals.flatMap((g) => milestonesFor(g).map((m) => ({ ...m, goalTitle: g.title, trackColor: TYPE_COLOR[g.type], person: who })));
                const all = viewedIds.flatMap(milestonesOf);
                const upcoming = all.filter((m) => !m.done);
                const done = all.filter((m) => m.done).slice().reverse();
                const upcomingShown = showAllUpcoming ? upcoming : upcoming.slice(0, 5);
                const doneShown = showAllDone ? done : done.slice(0, 5);

                const gridOf = (who) => buildMonthGrid(viewDate.year, viewDate.month, people[who].calSeed, people[who].consistency);
                const dayMapFor = (who) => {
                  const map = {};
                  milestonesOf(who).forEach((m) => {
                    const parsed = parseMilestoneDate(m.date);
                    if (parsed.month === viewDate.month) map[parsed.day] = m;
                  });
                  return map;
                };

                const Row = (m) => (
                  <div key={m.id + m.person} className="rounded-xl px-3 py-2.5 flex items-center gap-3" style={{ background: C.surface, border: `1px solid ${C.line}`, opacity: m.done ? 0.5 : 1 }}>
                    <div className="w-12 shrink-0 font-display text-sm text-center" style={{ color: C.gold }}>{m.date}</div>
                    <div style={{ width: 1, height: 24, background: C.line }} />
                    {calendarView === "both" && <Avatar p={people[m.person]} size={20} />}
                    <div className="flex-1 min-w-0">
                      <div className="font-body text-[12px] truncate" style={{ color: C.text, textDecoration: m.done ? "line-through" : "none" }}>{m.label}</div>
                      <div className="font-body text-[10px] truncate" style={{ color: C.muted }}>{m.goalTitle}</div>
                    </div>
                    {m.done && <Check size={14} style={{ color: C.ok }} />}
                  </div>
                );

                const weekDays = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(weekAnchor, i));
                const sameMonth = weekDays[0].month === weekDays[6].month;
                const periodLabel = sameMonth
                  ? `${weekDays[0].day}–${weekDays[6].day} ${MONTH_NAMES[weekDays[0].month]} ${weekDays[0].year}`
                  : `${weekDays[0].day} ${monthAbbr(weekDays[0].month)} – ${weekDays[6].day} ${monthAbbr(weekDays[6].month)}`;

                return (
                  <>
                    <div className="flex gap-1.5 mb-3">
                      {[
                        { id: "mine", label: "Mój" },
                        { id: "partner", label: partnerP.name },
                        { id: "both", label: "Wspólny" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setCalendarView(opt.id)}
                          className="flex-1 font-body text-[11px] py-1.5 rounded-lg bg-transparent cursor-pointer"
                          style={{
                            border: `1px solid ${calendarView === opt.id ? C.gold : C.line}`,
                            color: calendarView === opt.id ? C.gold : C.muted,
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {calendarView === "both" && (() => {
                      const monthGridMine = buildMonthGrid(viewDate.year, viewDate.month, p.calSeed, p.consistency);
                      const monthGridPartner = buildMonthGrid(viewDate.year, viewDate.month, partnerP.calSeed, partnerP.consistency);
                      const mutualDays = monthGridMine.filter((c, i) => c && monthGridPartner[i] && c.state === "done" && monthGridPartner[i].state === "done").length;
                      return (
                        <div
                          className="rounded-2xl py-4 mb-3 flex flex-col items-center justify-center"
                          style={{ background: `linear-gradient(135deg, ${p.color}, ${partnerP.color})` }}
                        >
                          <div className="font-body text-[10px] uppercase tracking-wide" style={{ color: "#15241F", opacity: 0.75 }}>Wspólna seria</div>
                          <div className="font-display text-3xl" style={{ color: "#15241F" }}>{mutualDays}</div>
                        </div>
                      );
                    })()}

                    <div className="flex justify-end gap-1.5 mb-3">
                      {[{ id: "week", label: "Tydzień" }, { id: "month", label: "Miesiąc" }].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setViewType(opt.id)}
                          className="font-body text-[10px] px-2.5 py-1 rounded-full bg-transparent cursor-pointer"
                          style={{ border: `1px solid ${viewType === opt.id ? C.gold : C.line}`, color: viewType === opt.id ? C.gold : C.muted }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <button onClick={() => (viewType === "week" ? changeWeek(-1) : changeMonth(-1))} className="p-3 -m-2 bg-transparent border-0 cursor-pointer" style={{ color: C.muted }}>
                        <ChevronLeft size={18} />
                      </button>
                      <span className="font-head text-sm" style={{ color: C.text }}>{viewType === "week" ? periodLabel : `${MONTH_NAMES[viewDate.month]} ${viewDate.year}`}</span>
                      <button onClick={() => (viewType === "week" ? changeWeek(1) : changeMonth(1))} className="p-3 -m-2 bg-transparent border-0 cursor-pointer" style={{ color: C.muted }}>
                        <ChevronRight size={18} />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 mb-2 mt-1 flex-wrap">
                      {[
                        { label: "Zrobione", color: null },
                        { label: "Przesunięte", color: C.gold },
                        { label: "Pominięte", color: C.skipped },
                        { label: "Kamień milowy", color: null, ring: true },
                      ].map((it) => (
                        <div key={it.label} className="flex items-center gap-1">
                          <div className="w-2.5 h-2.5 rounded-[2px]" style={{ background: it.ring ? "transparent" : it.color || C.muted, border: it.ring ? `1.5px solid ${C.gold}` : it.color ? "none" : `1px solid ${C.muted}` }} />
                          <span className="font-body text-[9px]" style={{ color: C.muted }}>{it.label}</span>
                        </div>
                      ))}
                    </div>

                    {viewType === "week" ? (
                      <div className="flex flex-col gap-1.5 mb-4">
                        {weekDays.map((wd, i) => {
                          const isToday = wd.year === today.year && wd.month === today.month && wd.day === today.day;
                          const key = `${wd.month}-${wd.day}`;
                          const dayMilestones = viewedIds
                            .map((who) => milestonesOf(who).find((m) => { const pd = parseMilestoneDate(m.date); return pd.month === wd.month && pd.day === wd.day; }))
                            .filter(Boolean);
                          const daySelfTime = selfTimeLog.filter((s) => viewedIds.includes(s.person) && s.month === wd.month && s.day === wd.day);

                          return (
                            <div key={i} className="rounded-xl pr-3 py-2 flex items-center gap-3 overflow-hidden" style={{ background: C.surface, border: `1px solid ${isToday ? C.text : C.line}` }}>
                              <div
                                className="self-stretch shrink-0"
                                style={{
                                  width: 4,
                                  background:
                                    viewedIds.length === 2
                                      ? (() => {
                                          const stA = dayState(people[viewedIds[0]].calSeed, wd.year, wd.month, wd.day, people[viewedIds[0]].consistency);
                                          const stB = dayState(people[viewedIds[1]].calSeed, wd.year, wd.month, wd.day, people[viewedIds[1]].consistency);
                                          const colA = stA === "done" ? people[viewedIds[0]].color : stA === "moved" ? C.gold : stA === "skipped" ? C.skipped : C.surface2;
                                          const colB = stB === "done" ? people[viewedIds[1]].color : stB === "moved" ? C.gold : stB === "skipped" ? C.skipped : C.surface2;
                                          return `linear-gradient(180deg, ${colA} 50%, ${colB} 50%)`;
                                        })()
                                      : (() => {
                                          const st = dayState(people[viewedIds[0]].calSeed, wd.year, wd.month, wd.day, people[viewedIds[0]].consistency);
                                          return st === "done" ? people[viewedIds[0]].color : st === "moved" ? C.gold : st === "skipped" ? C.skipped : C.surface2;
                                        })(),
                                }}
                              />
                              <div className="w-9 shrink-0 text-center">
                                <div className="font-body" style={{ fontSize: 9, color: C.muted }}>{DAY_LABELS[i]}</div>
                                <div className="font-display text-sm" style={{ color: C.text }}>{wd.day}</div>
                              </div>
                              <div className="flex-1 min-w-0">
                                {dayMilestones.length > 0 || daySelfTime.length > 0 ? (
                                  <>
                                    {dayMilestones.map((m) => (
                                      <div key={m.id + m.person} className="font-body text-[11px] truncate flex items-center gap-1" style={{ color: m.done ? C.muted : C.text, textDecoration: m.done ? "line-through" : "none" }}>
                                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: m.trackColor }} />
                                        {m.label}
                                      </div>
                                    ))}
                                    {daySelfTime.map((s, si) => (
                                      <div key={si} className="font-body text-[11px] truncate flex items-center gap-1" style={{ color: C.gold }}>
                                        <Heart size={9} className="shrink-0" />
                                        Czas dla siebie{calendarView === "both" ? ` — ${people[s.person].name}` : ""} ({s.duration})
                                      </div>
                                    ))}
                                  </>
                                ) : (
                                  <span className="font-body text-[10px]" style={{ color: C.muted }}>—</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <>
                    <div className="grid gap-[3px] mb-1" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
                      {DAY_LABELS.map((d) => (
                        <div key={d} className="font-body text-center" style={{ fontSize: 8, color: C.muted }}>{d}</div>
                      ))}
                    </div>

                    {calendarView === "both" ? (
                      <div className="grid gap-[3px] mb-4" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
                        {gridOf(currentUser).map((cell, i) => {
                          const partnerCell = gridOf(partner)[i];
                          if (!cell) return <div key={i} className="aspect-square" />;
                          const myBg = cell.state === "done" ? p.color : cell.state === "moved" ? C.gold : cell.state === "skipped" ? C.skipped : C.surface2;
                          const partnerBg = partnerCell.state === "done" ? partnerP.color : partnerCell.state === "moved" ? C.gold : partnerCell.state === "skipped" ? C.skipped : C.surface2;
                          const m = dayMapFor(currentUser)[cell.day] || dayMapFor(partner)[cell.day];
                          const isToday = viewDate.year === today.year && viewDate.month === today.month && cell.day === today.day;
                          return (
                            <div key={i} className="aspect-square rounded-[2px] overflow-hidden relative flex" style={{ border: m ? `1.5px solid ${C.gold}` : "none", outline: isToday ? `1.5px solid ${C.text}` : "none", outlineOffset: 1 }}>
                              <div className="flex-1" style={{ background: myBg }} />
                              <div className="flex-1" style={{ background: partnerBg }} />
                              <span className="absolute inset-0 flex items-center justify-center" style={{ fontSize: 7, color: "#15241F", fontFamily: "Inter, sans-serif" }}>{cell.day}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid gap-[3px] mb-4" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
                        {gridOf(viewedIds[0]).map((cell, i) => {
                          if (!cell) return <div key={i} className="aspect-square" />;
                          const who = viewedIds[0];
                          const bg = cell.state === "done" ? people[who].color : cell.state === "moved" ? C.gold : cell.state === "skipped" ? C.skipped : C.surface2;
                          const digitColor = cell.state === "brak" ? C.muted : "#15241F";
                          const m = dayMapFor(who)[cell.day];
                          const isToday = viewDate.year === today.year && viewDate.month === today.month && cell.day === today.day;
                          return (
                            <div key={i} className="aspect-square rounded-[2px] flex items-center justify-center relative" style={{ background: bg, border: m ? `1.5px solid ${C.gold}` : "none", outline: isToday ? `1.5px solid ${C.text}` : "none", outlineOffset: 1 }}>
                              <span style={{ fontSize: 7, color: digitColor, fontFamily: "Inter, sans-serif" }}>{cell.day}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                      </>
                    )}

                    <SectionTitle icon={Calendar}>Do zrobienia</SectionTitle>
                    <div className="flex flex-col gap-2">
                      {upcoming.length === 0 && <div className="font-body text-[11px]" style={{ color: C.muted }}>Brak nadchodzących kamieni.</div>}
                      {upcomingShown.map(Row)}
                    </div>
                    {upcoming.length > 5 && (
                      <button onClick={() => setShowAllUpcoming((v) => !v)} className="mt-2 font-body text-[11px] bg-transparent border-0 cursor-pointer" style={{ color: C.gold }}>
                        {showAllUpcoming ? "Pokaż mniej" : `Pokaż więcej (${upcoming.length - 5})`}
                      </button>
                    )}

                    <SectionTitle icon={Check}>Zrealizowane</SectionTitle>
                    <div className="flex flex-col gap-2">
                      {done.length === 0 && <div className="font-body text-[11px]" style={{ color: C.muted }}>Jeszcze nic — pierwszy kamień milowy będzie tutaj.</div>}
                      {doneShown.map(Row)}
                    </div>
                    {done.length > 5 && (
                      <button onClick={() => setShowAllDone((v) => !v)} className="mt-2 font-body text-[11px] bg-transparent border-0 cursor-pointer" style={{ color: C.gold }}>
                        {showAllDone ? "Pokaż mniej" : `Pokaż więcej (${done.length - 5})`}
                      </button>
                    )}

                    {calendarView === "partner" && (
                      <button onClick={() => cheer(partner)} className={`w-full mt-4 flex items-center justify-center gap-1.5 font-body text-xs py-2 rounded-lg bg-transparent cursor-pointer ${poppedFor === partner ? "pop" : ""}`} style={{ color: C.gold, border: `1px solid ${C.gold}55` }}>
                        <Heart size={13} /> Kibicuj ({partnerP.cheers})
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {tab === "profil" && (
            <div className="rise">
              {(() => {
                const p = people[currentUser];
                const totalMilestones = p.goals.flatMap((g) => milestonesFor(g)).filter((m) => m.done).length;
                return (
                  <>
                    {croppingPhoto ? (
                      <div className="mt-4">
                        <PhotoCropper
                          src={croppingPhoto}
                          initial={p.photo}
                          onCancel={() => setCroppingPhoto(null)}
                          onConfirm={confirmPhoto}
                        />
                      </div>
                    ) : (
                    <>
                    <div className="flex flex-col items-center mb-5 mt-2">
                      <Avatar p={p} size={56} />
                      <span className="font-head text-lg mt-2" style={{ color: C.text }}>{p.name}</span>
                    </div>

                    <SectionTitle icon={Trophy}>Podsumowanie</SectionTitle>
                    <div className="flex justify-between mb-2 rounded-2xl p-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                      <div className="text-center flex-1">
                        <div className="font-display text-xl" style={{ color: C.gold }}>{p.streak}</div>
                        <div className="font-body text-[9px]" style={{ color: C.muted }}>bieżąca seria</div>
                      </div>
                      <div className="text-center flex-1">
                        <div className="font-display text-xl" style={{ color: C.text }}>{p.longestStreak}</div>
                        <div className="font-body text-[9px]" style={{ color: C.muted }}>rekord serii</div>
                      </div>
                      <div className="text-center flex-1">
                        <div className="font-display text-xl" style={{ color: p.color }}>{totalMilestones}</div>
                        <div className="font-body text-[9px]" style={{ color: C.muted }}>kamieni zdobytych</div>
                      </div>
                    </div>

                    {(() => {
                      const journeyGoals = p.goals.filter((g) => g.completedSessions != null);
                      if (journeyGoals.length === 0) return null;
                      return (
                        <>
                          <SectionTitle icon={Calendar}>Twoja podróż</SectionTitle>
                          {journeyGoals.map((journeyGoal) => {
                            const trackColor = TYPE_COLOR[journeyGoal.type];
                            const nodes = [
                              { label: "Start", date: journeyGoal.start, state: "past" },
                              ...milestonesFor(journeyGoal).map((m) => ({ label: m.label, date: m.date, state: m.done ? "past" : "future" })),
                            ];
                            const lastDoneIdx = nodes.map((n) => n.state).lastIndexOf("past");
                            nodes.splice(lastDoneIdx + 1, 0, { label: `Dziś — dzień ${journeyGoal.completedSessions}`, date: null, state: "today" });
                            return (
                              <div key={journeyGoal.id} className="rounded-2xl p-4 mb-2" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                                <div className="font-body text-[10px] mb-3" style={{ color: C.muted }}>{journeyGoal.title}</div>
                                <div className="flex flex-col">
                                  {nodes.map((n, i) => (
                                    <div key={i} className="flex gap-3">
                                      <div className="flex flex-col items-center">
                                        <div
                                          className={n.state === "today" ? "marker-pulse" : ""}
                                          style={{
                                            width: n.state === "today" ? 10 : 8,
                                            height: n.state === "today" ? 10 : 8,
                                            borderRadius: "50%",
                                            marginTop: 3,
                                            background: n.state === "future" ? "transparent" : n.state === "today" ? C.gold : trackColor,
                                            border: `1.5px solid ${n.state === "future" ? C.line : n.state === "today" ? C.gold : trackColor}`,
                                          }}
                                        />
                                        {i < nodes.length - 1 && <div style={{ width: 1.5, flex: 1, minHeight: 22, background: n.state === "future" ? C.line : trackColor, opacity: n.state === "future" ? 1 : 0.5 }} />}
                                      </div>
                                      <div className="pb-5 min-w-0">
                                        <div className="font-body text-[12px]" style={{ color: n.state === "future" ? C.muted : C.text, fontWeight: n.state === "today" ? 600 : 400 }}>{n.label}</div>
                                        {n.date && <div className="font-body text-[10px]" style={{ color: C.muted }}>{n.date}</div>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}

                    <SectionTitle icon={Settings}>Ustawienia</SectionTitle>
                    <div className="flex flex-col rounded-2xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
                      <button
                        onClick={() => setOpenSetting((s) => (s === "notif" ? null : "notif"))}
                        className="w-full flex items-center justify-between px-3 py-3 bg-transparent border-0 cursor-pointer text-left"
                        style={{ font: "inherit" }}
                      >
                        <span className="font-body text-xs" style={{ color: C.text }}>Powiadomienia</span>
                        <ChevronRight size={14} style={{ color: C.muted, transform: openSetting === "notif" ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                      </button>
                      {openSetting === "notif" && (
                        <div className="px-3 py-3 rise" style={{ borderTop: `1px solid ${C.line}`, background: C.surface2 }}>
                          {[
                            { label: "Powiadomienia push", val: pushEnabled, set: setPushEnabled },
                            { label: "Dźwięk", val: soundEnabled, set: setSoundEnabled },
                          ].map((row) => (
                            <div key={row.label} className="flex items-center justify-between py-1.5">
                              <span className="font-body text-xs" style={{ color: C.text }}>{row.label}</span>
                              <button onClick={() => row.set((v) => !v)} className="rounded-full relative bg-transparent border-0 cursor-pointer p-0" style={{ width: 34, height: 20, background: row.val ? C.gold : C.surface2, border: `1px solid ${row.val ? C.gold : C.line}` }}>
                                <div className="absolute rounded-full" style={{ width: 14, height: 14, top: 1, left: row.val ? 17 : 1, background: row.val ? "#15241F" : C.muted }} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => setOpenSetting((s) => (s === "account" ? null : "account"))}
                        className="w-full flex items-center justify-between px-3 py-3 bg-transparent border-0 cursor-pointer text-left"
                        style={{ borderTop: `1px solid ${C.line}`, font: "inherit" }}
                      >
                        <span className="font-body text-xs" style={{ color: C.text }}>Konto i połączenie z partnerem</span>
                        <ChevronRight size={14} style={{ color: C.muted, transform: openSetting === "account" ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                      </button>
                      {openSetting === "account" && (
                        <div className="px-3 py-3 rise" style={{ borderTop: `1px solid ${C.line}`, background: C.surface2 }}>
                          {partnerConnected ? (
                            <>
                              <div className="flex items-center gap-2 mb-2">
                                <Avatar p={people[partner]} size={26} />
                                <span className="font-body text-xs" style={{ color: C.text }}>Połączono z {people[partner].name}</span>
                              </div>
                              <button onClick={() => { setPartnerConnected(false); setReconnectCodeSent(false); setReconnectInput(""); }} className="font-body text-[11px] bg-transparent border-0 cursor-pointer" style={{ color: "#D9604E" }}>
                                Rozłącz
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="font-body text-xs mb-3" style={{ color: C.muted }}>Nie połączono z partnerką.</div>

                              {reconnectCodeSent ? (
                                <div className="rounded-xl p-3 text-center mb-3" style={{ background: C.surface, border: `1px solid ${C.gold}` }}>
                                  <div className="font-body text-[9px] mb-1" style={{ color: C.muted }}>Kod zaproszenia</div>
                                  <div className="font-display text-lg" style={{ color: C.gold, letterSpacing: "0.1em" }}>7K2M-9Q</div>
                                </div>
                              ) : (
                                <button onClick={() => setReconnectCodeSent(true)} className="w-full font-body text-[11px] px-3 py-2 rounded-lg cursor-pointer mb-3" style={{ background: C.gold, color: "#15241F", border: "none" }}>
                                  Wygeneruj kod
                                </button>
                              )}

                              <div className="font-body text-[10px] mb-2" style={{ color: C.muted }}>albo, jeśli to Ty dołączasz</div>
                              <div className="flex gap-2">
                                <input
                                  value={reconnectInput}
                                  onChange={(e) => setReconnectInput(e.target.value)}
                                  placeholder="Wpisz kod od partnerki"
                                  className="flex-1 font-body text-xs px-2.5 py-1.5 rounded-lg outline-none"
                                  style={{ background: C.surface, color: C.text, border: `1px solid ${C.line}` }}
                                />
                                <button
                                  onClick={() => reconnectInput.trim() && setPartnerConnected(true)}
                                  disabled={!reconnectInput.trim()}
                                  className="font-body text-[11px] px-3 py-1.5 rounded-lg cursor-pointer"
                                  style={{ background: reconnectInput.trim() ? C.gold : C.surface2, color: reconnectInput.trim() ? "#15241F" : C.muted, border: "none" }}
                                >
                                  Połącz
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      <button
                        onClick={() => setOpenSetting((s) => (s === "photo" ? null : "photo"))}
                        className="w-full flex items-center justify-between px-3 py-3 bg-transparent border-0 cursor-pointer text-left"
                        style={{ borderTop: `1px solid ${C.line}`, font: "inherit" }}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar p={p} size={26} />
                          <span className="font-body text-xs" style={{ color: C.text }}>Zdjęcie profilowe</span>
                        </div>
                        <ChevronRight size={14} style={{ color: C.muted, transform: openSetting === "photo" ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                      </button>
                      {openSetting === "photo" && (
                        <div className="px-3 py-3 rise" style={{ borderTop: `1px solid ${C.line}`, background: C.surface2 }}>
                          <div className="flex gap-2">
                            <label className="flex-1 font-body text-[10px] px-2 py-2.5 rounded-lg text-center cursor-pointer flex items-center justify-center gap-1" style={{ border: `1px solid ${C.line}`, color: C.text }}>
                              <Camera size={11} /> Zrób zdjęcie
                              <input type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => handlePhotoFile(e.target.files[0])} />
                            </label>
                            <label className="flex-1 font-body text-[10px] px-2 py-2.5 rounded-lg text-center cursor-pointer flex items-center justify-center gap-1" style={{ border: `1px solid ${C.line}`, color: C.text }}>
                              <ImageIcon size={11} /> Z galerii
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoFile(e.target.files[0])} />
                            </label>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => setOpenSetting((s) => (s === "selftime" ? null : "selftime"))}
                        className="w-full flex items-center justify-between px-3 py-3 bg-transparent border-0 cursor-pointer text-left"
                        style={{ borderTop: `1px solid ${C.line}`, font: "inherit" }}
                      >
                        <span className="font-body text-xs" style={{ color: C.text }}>Czas dla siebie</span>
                        <ChevronRight size={14} style={{ color: C.muted, transform: openSetting === "selftime" ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                      </button>
                      {openSetting === "selftime" && (
                        <div className="px-3 py-3 rise flex items-center justify-between" style={{ borderTop: `1px solid ${C.line}`, background: C.surface2 }}>
                          <span className="font-body text-[11px]" style={{ color: C.muted }}>Włączona</span>
                          <button onClick={() => setSelfTimeEnabled((v) => !v)} className="rounded-full relative bg-transparent border-0 cursor-pointer p-0" style={{ width: 34, height: 20, background: selfTimeEnabled ? C.gold : C.surface2, border: `1px solid ${selfTimeEnabled ? C.gold : C.line}`, transition: "background 0.2s" }}>
                            <div className="absolute rounded-full" style={{ width: 14, height: 14, top: 2, left: selfTimeEnabled ? 17 : 2, background: selfTimeEnabled ? "#15241F" : C.muted, transition: "left 0.2s" }} />
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => setOpenSetting((s) => (s === "calview" ? null : "calview"))}
                        className="w-full flex items-center justify-between px-3 py-3 bg-transparent border-0 cursor-pointer text-left"
                        style={{ borderTop: `1px solid ${C.line}`, font: "inherit" }}
                      >
                        <span className="font-body text-xs" style={{ color: C.text }}>Domyślny widok kalendarza</span>
                        <ChevronRight size={14} style={{ color: C.muted, transform: openSetting === "calview" ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                      </button>
                      {openSetting === "calview" && (
                      <div className="px-3 py-3 rise" style={{ borderTop: `1px solid ${C.line}`, background: C.surface2 }}>
                        <div className="flex gap-1.5 mb-2">
                          {[
                            { id: "mine", label: "Mój" },
                            { id: "partner", label: people[partner].name },
                            { id: "both", label: "Wspólny" },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => setCalendarView(opt.id)}
                              className="flex-1 font-body text-[11px] py-1.5 rounded-lg bg-transparent cursor-pointer"
                              style={{ border: `1px solid ${calendarView === opt.id ? C.gold : C.line}`, color: calendarView === opt.id ? C.gold : C.muted }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-1.5">
                          {[{ id: "week", label: "Tydzień" }, { id: "month", label: "Miesiąc" }].map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => setViewType(opt.id)}
                              className="flex-1 font-body text-[11px] py-1.5 rounded-lg bg-transparent cursor-pointer"
                              style={{ border: `1px solid ${viewType === opt.id ? C.gold : C.line}`, color: viewType === opt.id ? C.gold : C.muted }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      )}
                      <button
                        onClick={() => setOpenSetting((s) => (s === "about" ? null : "about"))}
                        className="w-full flex items-center justify-between px-3 py-3 bg-transparent border-0 cursor-pointer text-left"
                        style={{ borderTop: `1px solid ${C.line}`, font: "inherit" }}
                      >
                        <span className="font-body text-xs" style={{ color: C.text }}>O aplikacji</span>
                        <ChevronRight size={14} style={{ color: C.muted, transform: openSetting === "about" ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                      </button>
                      {openSetting === "about" && (
                        <div className="px-3 py-3 rise" style={{ borderTop: `1px solid ${C.line}`, background: C.surface2 }}>
                          <div className="font-display text-base mb-1" style={{ color: C.text }}>DWA <span style={{ color: C.gold }}>TORY</span></div>
                          <div className="font-body text-[10px] mb-2" style={{ color: C.muted }}>Wersja 1.0.0</div>
                          <div className="font-body text-[10px]" style={{ color: C.muted }}>Zbudowano dla Grześka i Wioli.</div>
                        </div>
                      )}
                    </div>
                    </>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {screen === "app" && tab !== "profil" && !milestoneReached && (
          <button
            onClick={startNewGoalScreen}
            className="absolute rounded-full flex items-center justify-center cursor-pointer"
            style={{ width: 52, height: 52, right: 16, bottom: 76, background: C.gold, color: "#15241F", boxShadow: "0 4px 14px rgba(0,0,0,0.45)", border: "none", zIndex: 15 }}
          >
            <Plus size={24} />
          </button>
        )}

        <div className="flex border-t" style={{ borderColor: C.line, background: C.surface }}>
          <TabButton id="dziennik" icon={BookOpen} label="Dziennik" />
          <TabButton id="cele" icon={Target} label="Cele" />
          <TabButton id="kalendarz" icon={Calendar} label="Kalendarz" />
          <TabButton id="profil" icon={User} label="Profil" />
        </div>

        {milestoneReached && (
          <div
            className="milestone-overlay absolute inset-0 flex items-center justify-center px-8"
            style={{ background: "rgba(11,21,18,0.72)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", zIndex: 40 }}
          >
            <div
              className="milestone-banner rounded-3xl p-6 relative overflow-visible text-center w-full"
              style={{ background: `linear-gradient(160deg, ${milestoneReached.color}33, ${C.surface})`, border: `1.5px solid ${milestoneReached.color}` }}
            >
              <Trophy size={30} style={{ color: milestoneReached.color }} className="mx-auto mb-3" />
              <div className="font-body text-[10px] uppercase tracking-wide mb-1.5" style={{ color: C.muted }}>Kamień milowy</div>
              <div className="font-head text-xl mb-1" style={{ color: C.text }}>{milestoneReached.label}</div>
              <div className="font-body text-xs" style={{ color: C.muted }}>{milestoneReached.goalTitle}</div>
              <Sparkles size={18} className="big-sparkle" style={{ color: milestoneReached.color, right: 18, top: 18 }} />
              <Sparkles size={12} className="big-sparkle" style={{ color: milestoneReached.color, left: 24, top: 30, animationDelay: "0.2s" }} />
              <Sparkles size={14} className="big-sparkle" style={{ color: milestoneReached.color, right: 40, bottom: 20, animationDelay: "0.4s" }} />
            </div>
          </div>
        )}
        </>
        )}

        <SplashOverlay visible={splashVisible} onDone={() => setSplashVisible(false)} />
      </div>
    </div>
  );
}
