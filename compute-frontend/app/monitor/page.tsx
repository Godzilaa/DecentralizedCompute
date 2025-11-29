"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { 
  Activity, 
  Server, 
  Cpu, 
  Box, 
  LayoutDashboard, 
  Settings, 
  Wallet,
  Clock,
  Database,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { VirtualTerminal } from '@/components/ui/VirtualTerminal';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

const MonitorContent = () => {
  // Mock Realtime Data for Chart
  const data = useMemo(() => 
    Array.from({ length: 20 }, (_, i) => ({
      name: i,
      loss: Math.max(0.5, 5 - Math.log(i + 1) - Math.random() * 0.5),
      gpu: 85 + Math.random() * 10
    }))
  , []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Monitor Header */}
      <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950/50 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-blue-500" />
            <h2 className="font-medium text-zinc-200">Llama-3-70b-FineTune</h2>
          </div>
          <Badge variant="outline" className="font-mono">ID: 9284-A</Badge>
          <Badge variant="success" className="animate-pulse">TRAINING</Badge>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
          <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> 8x H100</span>
          <span>|</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 04:12:33</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Terminal */}
        <div className="flex-1 p-4 lg:border-r border-zinc-800 min-h-[400px]">
          <VirtualTerminal />
        </div>

        {/* Right: Metrics */}
        <div className="w-full lg:w-[400px] bg-zinc-900/20 flex flex-col overflow-y-auto border-t lg:border-t-0 border-zinc-800">
          
          <div className="p-4 border-b border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Training Loss
            </h3>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <Line type="monotone" dataKey="loss" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <XAxis hide />
                  <YAxis hide domain={['dataMin', 'dataMax']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', fontSize: '12px' }}
                    itemStyle={{ color: '#e4e4e7' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-4 border-b border-zinc-800 space-y-4">
            <h3 className="text-sm font-medium text-zinc-400">Resource Usage</h3>
            {[
              { label: 'GPU Memory (VRAM)', val: '72GB / 80GB', pct: 90 },
              { label: 'System RAM', val: '128GB / 512GB', pct: 25 },
              { label: 'CPU Utilization', val: '42 Threads', pct: 60 }
            ].map((m, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-300">
                  <span>{m.label}</span>
                  <span className="font-mono">{m.val}</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-sm overflow-hidden">
                  <div className="h-full bg-zinc-500 rounded-sm" style={{ width: `${m.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 mt-auto">
             <Card className="bg-gradient-to-br from-zinc-900 to-zinc-900 border-zinc-700/50">
               <div className="flex items-center gap-3 mb-2">
                 <ShieldCheck className="w-5 h-5 text-purple-400" />
                 <span className="text-sm font-medium text-purple-100">Verifiable Compute</span>
               </div>
               <div className="space-y-2">
                 <div className="flex justify-between text-xs text-zinc-400">
                   <span>Proof Hash</span>
                   <span className="text-purple-300 hover:underline cursor-pointer">0x7f...3a2b</span>
                 </div>
                 <div className="flex justify-between text-xs text-zinc-400">
                   <span>Validator</span>
                   <span>Shelby-Oracle-01</span>
                 </div>
                 <Button size="sm" variant="outline" className="w-full mt-2 text-xs border-purple-500/20 text-purple-300 hover:bg-purple-900/20">
                   Verify on Aptos
                 </Button>
               </div>
             </Card>
          </div>

        </div>
      </div>
    </div>
  );
};

export default function MonitorPage() {
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-700 selection:text-white overflow-hidden">
      
      {/* Sidebar */}
      <aside className={cn(
        "w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col transition-all duration-300 ease-in-out"
      )}>
        <Link href="/overview" className="p-4 flex items-center gap-2 border-b border-zinc-800 h-16">
          <div className="w-6 h-6 bg-zinc-100 rounded-sm flex items-center justify-center">
            <div className="w-3 h-3 bg-zinc-900 rounded-[1px] transform rotate-45" />
          </div>
          <span className="font-bold tracking-tight">Shelby</span>
        </Link>

        <div className="flex-1 p-3 space-y-1">
          <Link href="/dashboard">
            <Button 
              variant="ghost"
              className="w-full justify-start gap-3"
            >
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Button>
          </Link>
          <Link href="/monitor">
            <Button 
              variant="secondary"
              className="w-full justify-start gap-3"
            >
              <Activity className="w-4 h-4" /> Monitor
            </Button>
          </Link>
          <Button variant="ghost" className="w-full justify-start gap-3 text-zinc-500">
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
             <span className="text-zinc-500 text-sm breadcrumbs">
                Platform / <span className="text-zinc-200 capitalize">monitor</span>
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
          </div>
        </header>

        <MonitorContent />
      </div>
    </div>
  );
}
