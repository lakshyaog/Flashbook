import React from 'react';
import { Zap, LayoutDashboard, CandlestickChart, Bot, History, Droplet, Settings } from 'lucide-react';

export type Page = 'dashboard' | 'markets' | 'market-maker' | 'history';

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  onOpenFaucet: () => void;
}

const NAV_ITEMS: Array<{ page: Page; icon: typeof LayoutDashboard; label: string }> = [
  { page: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { page: 'markets', icon: CandlestickChart, label: 'Markets' },
  { page: 'market-maker', icon: Bot, label: 'AI Market Maker' },
  { page: 'history', icon: History, label: 'History' },
];

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, onOpenFaucet }) => {
  return (
    <aside className="hidden md:flex flex-col items-center w-[68px] shrink-0 border-r border-border bg-white sticky top-0 h-screen py-4 z-50">
      {/* Logo mark */}
      <button
        onClick={() => onNavigate('dashboard')}
        className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/30 mb-8"
      >
        <Zap className="w-5 h-5 text-white fill-white" />
      </button>

      <nav className="flex flex-col gap-2 flex-1">
        {NAV_ITEMS.map(({ page, icon: Icon, label }) => {
          const active = page === activePage;
          return (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={`group relative w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                active
                  ? 'bg-brand/10 text-brand'
                  : 'text-textMuted hover:text-textPrimary hover:bg-surfaceHover'
              }`}
            >
              {active && <span className="absolute -left-[13px] w-1 h-6 rounded-r-full bg-brand" />}
              <Icon className="w-5 h-5" />
              <span className="pointer-events-none absolute left-14 whitespace-nowrap rounded-md bg-textPrimary px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2">
        <button
          onClick={onOpenFaucet}
          title="Testnet Faucet"
          className="w-11 h-11 rounded-xl flex items-center justify-center text-textMuted hover:text-brand hover:bg-surfaceHover transition-all"
        >
          <Droplet className="w-5 h-5" />
        </button>
        <button
          title="Settings"
          className="w-11 h-11 rounded-xl flex items-center justify-center text-textMuted hover:text-textPrimary hover:bg-surfaceHover transition-all"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
};
