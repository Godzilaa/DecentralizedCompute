'use client';

import { useState } from 'react';
import { Activity, Clock, Play, Server, MonitorPlay, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useJobs, useNodes, useSystemStats, api, type JobCreateRequest, type JobScriptUpload } from '@/lib/api';
import JobCreationWizard from '@/components/job-creation-wizard';
import ScriptEditor from '@/components/script-editor';

/**
 * PAGE: Dashboard
 */
export default function DashboardPage({ 
    setView, 
    setSelectedJobId 
}: { 
    setView: (v: string) => void;
    setSelectedJobId: (id: string) => void;
}) {
    const { jobs, loading: jobsLoading, error: jobsError, refetch: refetchJobs } = useJobs();
    const { nodes, loading: nodesLoading } = useNodes();
    const { stats, loading: statsLoading } = useSystemStats();
    const [showJobWizard, setShowJobWizard] = useState(false);
    const [showScriptUpload, setShowScriptUpload] = useState(false);

    const handleCreateJob = async (jobData: JobCreateRequest) => {
        try {
            const result = await api.createJob(jobData);
            console.log('Job created:', result);
            refetchJobs();
            setShowCreateJob(false);
        } catch (error) {
            console.error('Failed to create job:', error);
        }
    };

    const handleUploadScript = async (scriptData: JobScriptUpload) => {
        try {
            const result = await api.uploadScript(scriptData);
            console.log('Script uploaded:', result);
            setShowScriptUpload(false);
        } catch (error) {
            console.error('Failed to upload script:', error);
        }
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'running':
            case 'assigned':
                return 'success';
            case 'failed':
                return 'warning';
            case 'finished':
                return 'default';
            default:
                return 'outline';
        }
    };

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
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowScriptUpload(true)}>
                        <Upload className="w-4 h-4" /> Upload Script
                    </Button>
                    <Button size="sm" className="gap-2" onClick={() => setShowJobWizard(true)}>
                        <Plus className="w-4 h-4" /> New Job
                    </Button>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { 
                        label: "Active Jobs", 
                        value: statsLoading ? "..." : stats?.activeJobs.toString() || "0", 
                        change: statsLoading ? "..." : `${stats?.totalJobs || 0} total`, 
                        color: "text-white" 
                    },
                    { 
                        label: "GPU Utilization", 
                        value: statsLoading ? "..." : `${stats?.gpuUtilization.toFixed(1) || "0"}%`, 
                        change: "+5.1%", 
                        color: "text-emerald-400" 
                    },
                    { 
                        label: "Network I/O", 
                        value: statsLoading ? "..." : `${(stats?.networkIO || 0).toFixed(1)} GB/s`, 
                        change: "stable", 
                        color: "text-blue-400" 
                    },
                    { 
                        label: "Credits Spent", 
                        value: statsLoading ? "..." : `${stats?.creditsSpent.toFixed(1) || "0"} PHT`, 
                        change: statsLoading ? "..." : `${stats?.creditsPerHour.toFixed(1) || "0"}/hr`, 
                        color: "text-zinc-300" 
                    },
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
                                {jobsLoading ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                                            Loading jobs...
                                        </td>
                                    </tr>
                                ) : jobsError ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-red-400">
                                            Error: {jobsError}
                                        </td>
                                    </tr>
                                ) : jobs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                                            No jobs found. Create your first job!
                                        </td>
                                    </tr>
                                ) : (
                                    jobs.map((job) => (
                                        <tr key={job.jobId} className="hover:bg-zinc-800/30 transition-colors">
                                            <td className="px-4 py-3 font-mono text-zinc-500">
                                                {job.jobId.split('-').pop()?.slice(0, 8)}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-zinc-200">
                                                <div className="flex flex-col">
                                                    <span>{job.payload?.datasetName || job.jobId}</span>
                                                    <span className="text-xs text-zinc-500">
                                                        {job.payload?.meta?.type || 'Training'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-zinc-400">
                                                {job.assigned ? 'Assigned' : 'Available'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={getStatusBadgeVariant(job.status)}>
                                                    {job.status.toUpperCase()}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => {
                                                        setSelectedJobId(job.jobId);
                                                        setView('monitor');
                                                    }}
                                                >
                                                    <MonitorPlay className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sidebar: Nodes */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-zinc-200">Cluster Health</h3>
                    <div className="space-y-3">
                        {nodesLoading ? (
                            <Card>
                                <div className="text-center py-4 text-zinc-500">
                                    Loading nodes...
                                </div>
                            </Card>
                        ) : nodes.length === 0 ? (
                            <Card>
                                <div className="text-center py-4 text-zinc-500">
                                    No nodes connected
                                </div>
                            </Card>
                        ) : (
                            nodes.map((node) => (
                                <Card key={node.nodeId} className="group hover:border-zinc-600 transition-colors cursor-pointer">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${node.status === 'online' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                            <span className="text-sm font-medium text-zinc-300">
                                                {node.region || node.nodeId.slice(0, 8)}
                                            </span>
                                        </div>
                                        <span className="text-xs font-mono text-zinc-500">
                                            {node.uptime || new Date(node.lastSeen).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-zinc-400">
                                            <span>CPU Load</span>
                                            <span>{node.specs.cpuUsage.toFixed(1)}%</span>
                                        </div>
                                        <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-zinc-400 rounded-full"
                                                style={{ width: `${node.specs.cpuUsage}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs text-zinc-400 mt-2">
                                            <span>RAM Usage</span>
                                            <span>{node.specs.ramUsage.toFixed(1)}%</span>
                                        </div>
                                        <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-400 rounded-full"
                                                style={{ width: `${node.specs.ramUsage}%` }}
                                            />
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}

                        <Card className="border-dashed border-zinc-800 bg-transparent flex items-center justify-center py-6 cursor-pointer hover:bg-zinc-900/50 hover:border-zinc-700 transition-all">
                            <span className="text-sm text-zinc-500 flex items-center gap-2">
                                <Server className="w-4 h-4" /> Add Node Provider
                            </span>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Job Creation Wizard */}
            {showJobWizard && (
                <JobCreationWizard
                    onClose={() => setShowJobWizard(false)}
                    onJobCreated={(jobId) => {
                        refetchJobs();
                        setSelectedJobId(jobId);
                        setView('monitor');
                    }}
                />
            )}

            {/* Upload Script Modal */}
            {showScriptUpload && (
                <ScriptEditor
                    onSave={async (script, requirements, entrypoint) => {
                        // This would need a job ID input - for now just close
                        setShowScriptUpload(false);
                    }}
                    onClose={() => setShowScriptUpload(false)}
                />
            )}
        </div>
    );
}
