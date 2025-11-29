"use client";

import React from 'react';
import Link from 'next/link';
import { 
  Terminal, 
  ShieldCheck, 
  Zap, 
  ChevronRight, 
  ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MeshBackground } from '@/components/ui/MeshBackground';

const LandingPage = () => (
  <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
    <MeshBackground />
    
    <div className="relative z-10 w-full max-w-5xl px-6 flex flex-col items-start gap-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-medium text-zinc-400 tracking-wide uppercase">Shelby Compute Network v2.1 Online</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-zinc-500 pb-2">
          Turn machines into <br />
          verifiable compute.
        </h1>
        <p className="text-xl text-zinc-400 max-w-2xl leading-relaxed">
          Orchestrate decentralized compute clusters for AI/ML workloads. 
          Verified on-chain with cryptographic proofs of training.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Link href="/dashboard">
          <Button size="lg" className="gap-2">
            Launch Dashboard <ArrowUpRight className="w-4 h-4" />
          </Button>
        </Link>
        <Button variant="outline" size="lg" className="gap-2">
          View Architecture <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Feature Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-12 pt-12 border-t border-zinc-800/50">
        {[
          { icon: Terminal, title: "Real-time Logging", desc: "Xterm.js integration for zero-latency stream observation." },
          { icon: ShieldCheck, title: "On-chain Provenance", desc: "Every epoch hashed and settled on Aptos & Irys." },
          { icon: Zap, title: "Global Latency", desc: "< 40ms routing via edge-optimized coordination nodes." }
        ].map((feature, i) => (
          <div key={i} className="flex gap-4 items-start group">
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
              <feature.icon className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-zinc-200">{feature.title}</h3>
              <p className="text-sm text-zinc-500 mt-1">{feature.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default function OverviewPage() {
  return (
    <main className="bg-zinc-950 min-h-screen text-zinc-100 font-sans selection:bg-zinc-700 selection:text-white">
      {/* Simple Nav for Landing */}
      <nav className="absolute top-0 w-full z-50 px-6 py-4 flex justify-between items-center">
        <Link href="/overview" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-zinc-100 rounded-md flex items-center justify-center">
            <div className="w-4 h-4 bg-zinc-900 rounded-sm transform rotate-45" />
          </div>
          <span className="font-bold text-lg tracking-tight">ShelbyCompute</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">Dashboard</Button>
          </Link>
          <Button variant="primary" size="sm">Connect Wallet</Button>
        </div>
      </nav>
      <LandingPage />
    </main>
  );
}
