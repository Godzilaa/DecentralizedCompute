"use client";

import React from 'react';
import Link from 'next/link';
import { 
  Activity, 
  Server, 
  LayoutDashboard, 
  MonitorPlay, 
  Settings, 
  Wallet,
  Play,
  Clock,
  Database,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

const MOCK_JOBS = [
  { id: 'job-x92-alpha', name: 'Llama-3-70b-FineTune', status: 'running', type: 'Training', gpu: '8x H100', duration: '4h 12m', cost: '12.42 PHOTON' },
  { id: 'job-b21-delta', name: 'Stable-Diffusion-XL-Inference', status: 'completed', type: 'Inference', gpu: '1x A100', duration: '45m', cost: '0.85 PHOTON' },
  { id: 'job-c55-gamma', name: 'Protein-Folding-Sim-V2', status: 'queued', type: 'Simulation', gpu: '4x A6000', duration: '-', cost: 'Est. 4.20 PHOTON' },
  { id: 'job-f11-omega', name: 'RAG-Vector-Embeddings', status: 'failed', type: 'Data Proc', gpu: '2x T4', duration: '12m', cost: '0.02 PHOTON' },
];

const MOCK_NODES = [
  { id: 'node-us-east-01', region: 'US-VA', status: 'online', uptime: '99.98%', load: 84 },
  { id: 'node-eu-west-04', region: 'EU-DE', status: 'online', uptime: '99.95%', load: 62 },
  { id: 'node-asia-ne-02', region: 'JP-TY', status: 'maintenance', uptime: '98.50%', load: 0 },
];

const DashboardContent = () => (
  <div className="flex-1 p-6 space-y-6 overflow-y-auto">
    {/* Header */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 className="text-2xl font-semibold text-white">Platform Overview</h2>
        <p className="text-zinc-400">Manage your clusters and active training jobs.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="gap-2">
          <Clock className="w-4 h-4" /> Last 24h
        </Button>
        <Button size="sm" className="gap-2">
          <Play className="w-4 h-4" /> New Job
        </Button>
      </div>
    </div>

    {/* Metric Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: "Active Jobs", value: "12", change: "+2", color: "text-white" },
        { label: "GPU Utilization", value: "84.2%", change: "+5.1%", color: "text-emerald-400" },
        { label: "Network I/O", value: "4.2 GB/s", change: "stable", color: "text-blue-400" },
        { label: "Credits Spent", value: "245.2 PHT", change: "12.4/hr", color: "text-zinc-300" },
      ].map((stat, i) => (
        <Card key={i}>
          <div className="flex justify-between items-start">
            <span className="text-zinc-500 text-sm font-medium">{stat.label}</span>
            <Activity className="w-4 h-4 text-zinc-700" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-mono font-medium ${stat.color}`}>{stat.value}</span>
            <span className="text-xs text-zinc-600 font-mono">{stat.change}</span>
          </div>
        </Card>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content: Active Jobs */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-zinc-200">Active Workloads</h3>
          <Button variant="ghost" size="sm" className="text-xs">View All</Button>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-medium">
              <tr>
                <th className="px-4 py-3">Job ID</th>
                <th className="px-4 py-3">Workload Name</th>
                <th className="px-4 py-3">Hardware</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {MOCK_JOBS.map((job) => (
                <tr key={job.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-zinc-500">{job.id.split('-')[1]}</td>
                  <td className="px-4 py-3 font-medium text-zinc-200">
                    <div className="flex flex-col">
                      <span>{job.name}</span>
                      <span className="text-xs text-zinc-500">{job.type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{job.gpu}</td>
                  <td className="px-4 py-3">
                    <Badge variant={job.status === 'running' ? 'success' : job.status === 'failed' ? 'warning' : 'outline'}>
                      {job.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href="/monitor">
                      <Button variant="ghost" size="sm">
                        <MonitorPlay className="w-4 h-4" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sidebar: Nodes */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-zinc-200">Cluster Health</h3>
        <div className="space-y-3">
          {MOCK_NODES.map((node) => (
            <Card key={node.id} className="group hover:border-zinc-600 transition-colors cursor-pointer">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${node.status === 'online' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="text-sm font-medium text-zinc-300">{node.region}</span>
                </div>
                <span className="text-xs font-mono text-zinc-500">{node.uptime}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Load</span>
                  <span>{node.load}%</span>
                </div>
                <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-zinc-400 rounded-full" 
                    style={{ width: `${node.load}%` }} 
                  />
                </div>
              </div>
            </Card>
          ))}
          
          <Card className="border-dashed border-zinc-800 bg-transparent flex items-center justify-center py-6 cursor-pointer hover:bg-zinc-900/50 hover:border-zinc-700 transition-all">
            <span className="text-sm text-zinc-500 flex items-center gap-2">
              <Server className="w-4 h-4" /> Add Node Provider
            </span>
          </Card>
        </div>
      </div>
    </div>
  </div>
);

export default function DashboardPage() {
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
              variant="secondary"
              className="w-full justify-start gap-3"
            >
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Button>
          </Link>
          <Link href="/monitor">
            <Button 
              variant="ghost"
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
                Platform / <span className="text-zinc-200 capitalize">dashboard</span>
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

        <DashboardContent />
      </div>
    </div>
  );
}
