'use client';

import { useMemo } from 'react';
import { Box, Cpu, Clock, Activity, ShieldCheck } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { VirtualTerminal } from '@/components/virtual-terminal';

/**
 * PAGE: Monitor
 */
export default function MonitorPage() {
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
}
