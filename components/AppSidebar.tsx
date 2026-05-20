type SidebarView = "home" | "market";

type AppSidebarProps = {
  activeView: SidebarView;
  darkMode: boolean;
  onNavigate: (view: SidebarView) => void;
  onToggleTheme: () => void;
};

export function AppSidebar({ activeView, darkMode, onNavigate, onToggleTheme }: AppSidebarProps) {
  return (
    <aside className="hidden border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-64 lg:border-r dark:border-slate-800 dark:bg-slate-950">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-5 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-mono text-sm font-black text-white shadow-sm">
            IR
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-slate-950 dark:text-slate-50">Risk Radar</p>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Injective</p>
          </div>
        </div>

        <div className="space-y-5 px-4 py-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 dark:border-blue-500/30 dark:bg-blue-500/10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-500">Guest mode</p>
          </div>

          <nav aria-label="Primary" className="space-y-1">
            <SidebarItem active={activeView === "home"} icon="home" label="Home" meta="Wallet risk dashboard" onClick={() => onNavigate("home")} />
            <SidebarItem active={activeView === "market"} icon="market" label="Crypto Market" meta="INJ, USDT, USDC" onClick={() => onNavigate("market")} />
            <SidebarItem disabled icon="quest" label="Quest" meta="Coming soon" />
            <SidebarItem icon="settings" label="Settings" meta={darkMode ? "Light screen" : "Dark screen"} onClick={onToggleTheme} />
          </nav>
        </div>

        <div className="mt-auto border-t border-slate-200 p-4 dark:border-slate-800">
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            Risk analysis only. Portfolio reads are stateless and informational.
          </p>
        </div>
      </div>
    </aside>
  );
}

function SidebarItem({
  active = false,
  disabled = false,
  icon,
  label,
  meta,
  onClick
}: {
  active?: boolean;
  disabled?: boolean;
  icon: "home" | "market" | "quest" | "settings";
  label: string;
  meta: string;
  onClick?: () => void;
}) {
  return (
    <button
      className={
        "w-full rounded-xl border px-3 py-3 text-left transition " +
        (active
          ? "border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
          : disabled
            ? "cursor-not-allowed border-transparent text-slate-400 opacity-70 dark:text-slate-500"
            : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 dark:text-slate-300 dark:hover:border-slate-800 dark:hover:bg-slate-900")
      }
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-start gap-3">
        <SidebarIcon icon={icon} />
        <div>
          <p className="text-sm font-semibold">
            {icon === "home" ? "🏠 " : icon === "market" ? "📈 " : icon === "quest" ? "🎯 " : "⚙️ "}
            {label}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">{meta}</p>
        </div>
      </div>
    </button>
  );
}

function SidebarIcon({ icon }: { icon: "home" | "market" | "quest" | "settings" }) {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-blue-600 shadow-sm ring-1 ring-blue-100 dark:bg-slate-900 dark:ring-slate-700"
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
        {icon === "home" ? (
          <>
            <path d="M2.5 7.2 8 2.8l5.5 4.4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
            <path d="M4.2 6.8v6h7.6v-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
          </>
        ) : null}
        {icon === "market" ? (
          <>
            <path d="M3 13V8.5M8 13V4M13 13V6.5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
            <path d="M2.5 13.2h11" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
          </>
        ) : null}
        {icon === "quest" ? (
          <>
            <path d="M4 13V3.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
            <path d="M4.5 3.5h6.8L9.5 6l1.8 2.5H4.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
          </>
        ) : null}
        {icon === "settings" ? (
          <>
            <path d="M8 5.1a2.9 2.9 0 1 1 0 5.8 2.9 2.9 0 0 1 0-5.8Z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 1.8v1.5M8 12.7v1.5M1.8 8h1.5M12.7 8h1.5M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M12.4 3.6l-1.1 1.1M4.7 11.3l-1.1 1.1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
          </>
        ) : null}
      </svg>
    </span>
  );
}
