'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  Activity,
  Server,
  Database,
  Wallet,
  Settings,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import LandingPage from './(views)/overview/page';
import DashboardPage from './(views)/dashboard/page';
import MonitorPage from './(views)/monitor/page';
import NodesPage from './(views)/nodes/page';

/**
 * MAIN LAYOUT SHELL & APP
 */
export default function App() {
  const [currentView, setCurrentView] = useState('overview'); // overview, dashboard, monitor
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [isSidebarOpen] = useState(true);

  if (currentView === 'overview') {
    return (
      <main className="bg-zinc-950 min-h-screen text-zinc-100 font-sans selection:bg-zinc-700 selection:text-white">
        {/* Simple Nav for Landing */}
        <nav className="absolute top-0 w-full z-50 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-100 rounded-md flex items-center justify-center">
              <div className="w-4 h-4 bg-zinc-900 rounded-sm transform rotate-45" />
            </div>
            <span className="font-bold text-lg tracking-tight">ShelbyCompute</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setCurrentView('dashboard')}>Dashboard</Button>
            <Button variant="primary" size="sm">Connect Wallet</Button>
          </div>
        </nav>
        <LandingPage onLaunch={() => setCurrentView('dashboard')} />
      </main>
    );
  }

  // Dashboard / Monitor Layout
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-700 selection:text-white overflow-hidden">

      {/* Sidebar */}
      <aside className={cn(
        "w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col transition-all duration-300 ease-in-out",
        !isSidebarOpen && "w-0 -ml-4 opacity-0 overflow-hidden"
      )}>
        <div className="p-4 flex items-center gap-2 border-b border-zinc-800 h-16">
          <div className="w-6 h-6 bg-zinc-100 rounded-sm flex items-center justify-center">
            <div className="w-3 h-3 bg-zinc-900 rounded-[1px] transform rotate-45" />
          </div>
          <span className="font-bold tracking-tight">Shelby</span>
        </div>

        <div className="flex-1 p-3 space-y-1">
          <Button
            variant={currentView === 'dashboard' ? 'secondary' : 'ghost'}
            className="w-full justify-start gap-3"
            onClick={() => setCurrentView('dashboard')}
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Button>
          <Button
            variant={currentView === 'monitor' ? 'secondary' : 'ghost'}
            className="w-full justify-start gap-3"
            onClick={() => setCurrentView('monitor')}
          >
            <Activity className="w-4 h-4" /> Monitor
          </Button>
          <Button
            variant={currentView === 'nodes' ? 'secondary' : 'ghost'}
            className="w-full justify-start gap-3"
            onClick={() => setCurrentView('nodes')}
          >
            <Server className="w-4 h-4" /> Nodes <Badge variant="outline" className="ml-auto text-[10px]">3</Badge>
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-zinc-500">
            <Database className="w-4 h-4" /> Datasets
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-zinc-500">
            <Wallet className="w-4 h-4" /> Billing
          </Button>
        </div>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">DevTeam_01</span>
              <span className="text-xs text-zinc-500">Free Tier</span>
            </div>
            <Settings className="w-4 h-4 text-zinc-500 ml-auto cursor-pointer hover:text-white" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950">
          <div className="flex items-center gap-4">
            {/* Toggle Sidebar placeholder logic if needed */}
            <span className="text-zinc-500 text-sm breadcrumbs">
              Platform / <span className="text-zinc-200 capitalize">{currentView}</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search jobs, hashes..."
                className="bg-zinc-900 border border-zinc-800 rounded-md py-1.5 pl-9 pr-4 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600 w-64"
              />
            </div>
            <div className="h-4 w-[1px] bg-zinc-800 mx-2" />
            <Button variant="outline" size="sm" className="gap-2 font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Mainnet
            </Button>
          </div>
        </header>

        {/* View Router */}
        {currentView === 'dashboard' && (
          <DashboardPage 
            setView={setCurrentView} 
            setSelectedJobId={setSelectedJobId}
          />
        )}
        {currentView === 'monitor' && (
          <MonitorPage selectedJobId={selectedJobId} />
        )}
        {currentView === 'nodes' && (
          <NodesPage />
        )}
      </div>
    </div>
  );
}
