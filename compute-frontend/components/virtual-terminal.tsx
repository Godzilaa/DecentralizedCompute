'use client';

import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { LOG_STREAM_SOURCE } from '@/lib/constants';

/**
 * COMPONENT: Virtual Terminal (Xterm Simulation)
 */
export const VirtualTerminal = () => {
    const [logs, setLogs] = useState<string[]>([
        "[SYSTEM] Connection established to wss://node-h100-04.shelby.compute",
        "[SYSTEM] Handshake verified. Session ID: 0x92f...a1",
    ]);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let lineIndex = 0;
        const interval = setInterval(() => {
            if (lineIndex < LOG_STREAM_SOURCE.length) {
                setLogs(prev => [...prev, LOG_STREAM_SOURCE[lineIndex]]);
                lineIndex++;
            } else {
                // Loop randomly for "live" feel
                const randomMetric = Math.random();
                if (randomMetric > 0.7) {
                    setLogs(prev => [...prev, `[METRIC] GPU Util: ${Math.floor(95 + Math.random() * 5)}% | Temp: ${Math.floor(65 + Math.random() * 5)}C`]);
                }
            }
        }, 1500);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

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
                {logs.map((log, i) => (
                    <div key={i} className="text-zinc-300 whitespace-pre-wrap break-all">
                        <span className="text-zinc-600 mr-2">
                            {new Date().toLocaleTimeString('en-US', { hour12: false })}
                        </span>
                        {log.includes("[INFO]") ? <span className="text-blue-400">{log}</span> :
                            log.includes("[WARN]") ? <span className="text-amber-400">{log}</span> :
                                log.includes("[CHAIN]") ? <span className="text-purple-400">{log}</span> :
                                    log}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
        </div>
    );
};
