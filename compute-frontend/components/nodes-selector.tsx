"use client";

import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Circle, Cpu, HardDrive, Server } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNodes, type Node } from '@/lib/api';

interface NodesSelectorProps {
  onSelectNodes: (nodeIds: string[]) => void;
  jobCreationMode?: boolean;
  singleSelection?: boolean;
}

export default function NodesSelector({ onSelectNodes, jobCreationMode = false, singleSelection = false }: NodesSelectorProps) {
  const { nodes, loading, error, refetch } = useNodes();
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);

  useEffect(() => {
    if (jobCreationMode && nodes.length > 0 && selectedNodes.length === 0) {
      const onlineNodes = nodes.filter(n => n.status === 'online');
      const bestNode = onlineNodes.length > 0 ? onlineNodes[0] : nodes[0];
      if (bestNode) {
        setSelectedNodes([bestNode.nodeId]);
        onSelectNodes([bestNode.nodeId]);
      }
    }
  }, [jobCreationMode, nodes, onSelectNodes, selectedNodes.length]);

  useEffect(() => {
    onSelectNodes(selectedNodes);
  }, [selectedNodes, onSelectNodes]);

  const toggleNode = (nodeId: string) => {
    if (!jobCreationMode) return;
    if (singleSelection) {
      const newSel = selectedNodes.includes(nodeId) ? [] : [nodeId];
      setSelectedNodes(newSel);
    } else {
      setSelectedNodes(prev => prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'maintenance':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default:
        return <Circle className="w-4 h-4 text-zinc-500" />;
    }
  };

  if (loading) return <div className="text-zinc-400">Loading nodes...</div>;
  if (error) return <div className="text-red-400">Error loading nodes: {error}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {nodes.map((node: Node) => (
        <Card
          key={node.nodeId}
          className={`group hover:border-zinc-600 transition-all ${jobCreationMode ? 'cursor-pointer' : ''} ${jobCreationMode && selectedNodes.includes(node.nodeId) ? 'border-emerald-500 bg-emerald-500/5' : ''}`}
          onClick={() => toggleNode(node.nodeId)}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              {getStatusIcon(node.status)}
              <div>
                <h3 className="font-medium text-zinc-200 text-sm">Node {node.nodeId.slice(0,8)}</h3>
                <p className="text-xs text-zinc-500 font-mono">{node.nodeId}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">{node.status.toUpperCase()}</Badge>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-zinc-500" />
                <span className="text-xs text-zinc-400">CPU</span>
              </div>
              <span className="text-xs font-mono text-zinc-300">{node.specs.cpuUsage.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(100, node.specs.cpuUsage)}%` }} />
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-zinc-500" />
                <span className="text-xs text-zinc-400">RAM</span>
              </div>
              <span className="text-xs font-mono text-zinc-300">{node.specs.ramUsage.toFixed(1)}%</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
