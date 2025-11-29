'use client';

import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { type LogEntry } from '@/lib/api';

interface VirtualTerminalProps {
    logs?: LogEntry[];
    isLoading?: boolean;
    jobId?: string;
}

/**
 * COMPONENT: Virtual Terminal (Real logs from API)
 */
export const VirtualTerminal = ({ logs: apiLogs, isLoading, jobId }: VirtualTerminalProps) => {
    const [displayLogs, setDisplayLogs] = useState<string[]>([
        "[SYSTEM] Connection established to ShelbyCompute backend",
        "[SYSTEM] Waiting for job logs...",
    ]);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (apiLogs && apiLogs.length > 0) {
            // Convert API logs to display format
            const formattedLogs = apiLogs.map(log => {
                try {
                    // Try to parse as JSON (usage reports)
                    const parsed = JSON.parse(log.line);
                    if (parsed.cpu !== undefined && parsed.ram !== undefined) {
                        return `[METRIC] CPU: ${parsed.cpu.toFixed(1)}% | RAM: ${parsed.ram.toFixed(1)}% | TS: ${parsed.ts}`;
                    }
                } catch (e) {
                    // Not JSON, return as-is
                }
                return log.line;
            });
            
            setDisplayLogs([
                "[SYSTEM] Connection established to ShelbyCompute backend",
                `[SYSTEM] Monitoring job: ${jobId || 'unknown'}`,
                ...formattedLogs
            ]);
        } else if (isLoading) {
            setDisplayLogs([
                "[SYSTEM] Connection established to ShelbyCompute backend",
                "[SYSTEM] Loading job logs...",
            ]);
        }
    }, [apiLogs, isLoading, jobId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [displayLogs]);

    return (
        <div className="flex flex-col h-full bg-[#0c0c0c] border border-zinc-800 rounded-lg overflow-hidden font-mono text-xs md:text-sm shadow-inner">
            <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
                    <span className="text-zinc-500 ml-2">root@shelby-node-alpha:~</span>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-0">LIVE</Badge>
                </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {displayLogs.map((log, i) => (
                    <div key={i} className="text-zinc-300 whitespace-pre-wrap break-all">
                        <span className="text-zinc-600 mr-2">
                            {new Date().toLocaleTimeString('en-US', { hour12: false })}
                        </span>
                        {log.includes("[INFO]") ? <span className="text-blue-400">{log}</span> :
                            log.includes("[WARN]") ? <span className="text-amber-400">{log}</span> :
                                log.includes("[ERROR]") ? <span className="text-red-400">{log}</span> :
                                    log.includes("[METRIC]") ? <span className="text-green-400">{log}</span> :
                                        log.includes("[CHAIN]") ? <span className="text-purple-400">{log}</span> :
                                            log.includes("[container]") ? <span className="text-cyan-400">{log}</span> :
                                                log.includes("[SYSTEM]") ? <span className="text-yellow-400">{log}</span> :
                                                    log}
                    </div>
                ))}
                {isLoading && (
                    <div className="text-zinc-500 animate-pulse">
                        <span className="text-zinc-600 mr-2">
                            {new Date().toLocaleTimeString('en-US', { hour12: false })}
                        </span>
                        [SYSTEM] Loading more logs...
                    </div>
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    );
};
