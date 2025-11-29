'use client';

import { Activity, Clock, Play, Server, MonitorPlay } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MOCK_JOBS, MOCK_NODES } from '@/lib/constants';

/**
 * PAGE: Dashboard
 */
export default function DashboardPage({ setView }: { setView: (v: string) => void }) {
    return (
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
                                            <Button variant="ghost" size="sm" onClick={() => setView('monitor')}>
                                                <MonitorPlay className="w-4 h-4" />
                                            </Button>
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
}
