'use client';

import { useState, useEffect } from 'react';
import { 
  Server, 
  Activity, 
  Cpu, 
  HardDrive, 
  Clock, 
  MapPin, 
  Play,
  Plus,
  CheckCircle,
  AlertCircle,
  Circle,
  Filter,
  Search,
  Zap,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useNodes, api, type Node } from '@/lib/api';
import ConfirmDialog from '@/components/confirm-dialog';

/**
 * Enhanced Nodes View with node selection, filtering, and job creation integration
 */
export default function NodesPage({ 
  onSelectNodes, 
  jobCreationMode = false,
  singleSelection = false 
}: { 
  onSelectNodes?: (nodeIds: string[]) => void;
  jobCreationMode?: boolean;
  singleSelection?: boolean;
}) {
  const { nodes, loading, error, refetch } = useNodes();
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'cpu' | 'ram'>('status');

  // Auto-select the best node when in job creation mode
  useEffect(() => {
    if (jobCreationMode && nodes.length > 0 && selectedNodes.length === 0) {
      // Find the best node (first online node, or first node if none online)
      const onlineNodes = nodes.filter(node => node.status === 'online');
      const bestNode = onlineNodes.length > 0 ? onlineNodes[0] : nodes[0];
      
      if (bestNode) {
        console.log('Auto-selecting best node:', bestNode.nodeId);
        const newSelection = [bestNode.nodeId];
        setSelectedNodes(newSelection);
        onSelectNodes?.(newSelection);
      }
    }
  }, [nodes, jobCreationMode, selectedNodes.length, onSelectNodes]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; nodeId: string; nodeName: string }>({ 
    isOpen: false, 
    nodeId: '', 
    nodeName: '' 
  });
  const [deleting, setDeleting] = useState(false);

  // Filter and sort nodes
  const filteredNodes = nodes
    .filter(node => {
      if (filterStatus !== 'all' && node.status !== filterStatus) return false;
      if (searchTerm && !node.nodeId.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.nodeId.localeCompare(b.nodeId);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'cpu':
          return a.specs.cpuUsage - b.specs.cpuUsage;
        case 'ram':
          return a.specs.ramUsage - b.specs.ramUsage;
        default:
          return 0;
      }
    });

  const handleNodeSelection = (nodeId: string) => {
    console.log('handleNodeSelection called with:', nodeId, 'jobCreationMode:', jobCreationMode, 'singleSelection:', singleSelection);
    if (jobCreationMode && onSelectNodes) {
      let newSelection: string[];
      
      if (singleSelection) {
        // For single selection, either select this node or deselect if already selected
        newSelection = selectedNodes.includes(nodeId) ? [] : [nodeId];
      } else {
        // For multiple selection, toggle the node in the array
        newSelection = selectedNodes.includes(nodeId) 
          ? selectedNodes.filter(id => id !== nodeId)
          : [...selectedNodes, nodeId];
      }
      
      console.log('NodesPage - Previous selection:', selectedNodes);
      console.log('NodesPage - New selection:', newSelection);
      console.log('NodesPage - Calling onSelectNodes callback');
      
      setSelectedNodes(newSelection);
      onSelectNodes(newSelection);
    }
  };

  const handleDeleteNode = async () => {
    if (!deleteConfirm.nodeId) return;
    
    setDeleting(true);
    try {
      await api.deleteNode(deleteConfirm.nodeId);
      await refetch(); // Refresh the nodes list
      setDeleteConfirm({ isOpen: false, nodeId: '', nodeName: '' });
      console.log(`Node ${deleteConfirm.nodeId} deleted successfully`);
    } catch (error) {
      console.error('Failed to delete node:', error);
      
      // Extract error message from API response
      let errorMessage = 'Failed to delete node';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Show error in console and potentially a toast
      alert(`Error: ${errorMessage}`);
      
      // Keep the dialog open so user can see the error and try again
    } finally {
      setDeleting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'active':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'offline':
      default:
        return <Circle className="w-4 h-4 text-zinc-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'active':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20';
      case 'warning':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/20';
      case 'offline':
      default:
        return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/20';
    }
  };

  const formatUptime = (lastSeen: string) => {
    const now = Date.now() / 1000;
    const lastSeenTs = parseInt(lastSeen);
    const diffSeconds = now - lastSeenTs;
    
    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return `${Math.floor(diffSeconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <div className="animate-spin w-8 h-8 border-2 border-zinc-600 border-t-white rounded-full mx-auto" />
            <p className="text-zinc-400">Loading compute nodes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
            <p className="text-red-400">Failed to load nodes</p>
            <p className="text-zinc-500 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            {jobCreationMode ? 'Select Compute Nodes' : 'Compute Nodes'}
          </h2>
          <p className="text-zinc-400">
            {jobCreationMode 
              ? 'Choose nodes for your training job. Selected nodes will execute your workload.'
              : 'Manage and monitor your distributed compute infrastructure.'
            }
          </p>
          {jobCreationMode && selectedNodes.length > 0 && (
            <div className="mt-2">
              <Badge variant="secondary" className="gap-2">
                <CheckCircle className="w-3 h-3" />
                {singleSelection 
                  ? '1 node selected' 
                  : `${selectedNodes.length} node${selectedNodes.length > 1 ? 's' : ''} selected`
                }
              </Badge>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> Add Node
          </Button>
        </div>
      </div>

      {/* Filters and Stats */}
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-md py-2 pl-9 pr-4 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600 w-48"
            />
          </div>
          
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-300"
          >
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>

          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-300"
          >
            <option value="status">Sort by Status</option>
            <option value="name">Sort by Name</option>
            <option value="cpu">Sort by CPU</option>
            <option value="ram">Sort by RAM</option>
          </select>
        </div>

        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-zinc-400">Online: {nodes.filter(n => n.status === 'online' || n.status === 'active').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-zinc-400">Warning: {nodes.filter(n => n.status === 'warning').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-zinc-500" />
            <span className="text-zinc-400">Offline: {nodes.filter(n => n.status === 'offline').length}</span>
          </div>
        </div>
      </div>

      {/* Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredNodes.map((node) => (
          <Card 
            key={node.nodeId}
            className={`group hover:border-zinc-600 transition-all ${
              jobCreationMode ? 'cursor-pointer' : ''
            } ${
              jobCreationMode && selectedNodes.includes(node.nodeId) 
                ? 'border-emerald-500 bg-emerald-500/5' 
                : ''
            }`}
            onClick={() => {
              console.log('Node card clicked:', node.nodeId, 'Status:', node.status, 'Job creation mode:', jobCreationMode);
              if (jobCreationMode) {
                console.log('About to call handleNodeSelection');
                handleNodeSelection(node.nodeId);
              }
            }}
          >
            {/* Node Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                {getStatusIcon(node.status)}
                <div>
                  <h3 className="font-medium text-zinc-200 text-sm">
                    Node {node.nodeId.slice(0, 8)}
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono">
                    {node.nodeId}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {jobCreationMode && selectedNodes.includes(node.nodeId) && (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                )}
                <Badge variant="outline" className={`text-xs ${getStatusColor(node.status)}`}>
                  {node.status.toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Node Specs */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-zinc-500" />
                  <span className="text-xs text-zinc-400">CPU Usage</span>
                </div>
                <span className="text-xs font-mono text-zinc-300">
                  {node.specs.cpuUsage.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-400 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, node.specs.cpuUsage)}%` }}
                />
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-zinc-500" />
                  <span className="text-xs text-zinc-400">RAM Usage</span>
                </div>
                <span className="text-xs font-mono text-zinc-300">
                  {node.specs.ramUsage.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, node.specs.ramUsage)}%` }}
                />
              </div>

              {/* System Info */}
              <div className="pt-2 space-y-1 border-t border-zinc-800">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">OS</span>
                  <span className="text-zinc-300">{node.specs.os}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Platform</span>
                  <span className="text-zinc-300">{node.specs.platform}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">RAM</span>
                  <span className="text-zinc-300">{node.specs.totalRAM_GB}GB</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Last Seen</span>
                  <span className="text-zinc-300">{formatUptime(node.lastSeen)}</span>
                </div>
              </div>

              {/* Node Actions */}
              {!jobCreationMode && (
                <div className="pt-2 flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1 text-xs">
                    <Activity className="w-3 h-3 mr-1" />
                    Monitor
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    Config
                  </Button>
                  {!jobCreationMode && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`${
                        node.status === 'offline' 
                          ? 'text-red-400 hover:text-red-300' 
                          : 'text-red-300/50 hover:text-red-300/70'
                      }`}
                      onClick={() => setDeleteConfirm({ 
                        isOpen: true, 
                        nodeId: node.nodeId, 
                        nodeName: `Node ${node.nodeId.slice(0, 8)}` 
                      })}
                      title={node.status !== 'offline' ? 'Node must be offline to delete safely' : 'Delete node'}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredNodes.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Server className="w-12 h-12 text-zinc-600" />
          <div className="text-center">
            <h3 className="text-lg font-medium text-zinc-300 mb-2">
              {searchTerm || filterStatus !== 'all' ? 'No nodes found' : 'No compute nodes connected'}
            </h3>
            <p className="text-zinc-500 text-sm mb-4">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Connect your first compute node to start processing jobs.'
              }
            </p>
            {(!searchTerm && filterStatus === 'all') && (
              <Button variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Your First Node
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Selection Summary for Job Creation Mode */}
      {jobCreationMode && selectedNodes.length > 0 && (
        <div className="fixed bottom-6 right-6 bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-zinc-200">
                {singleSelection 
                  ? '1 node selected' 
                  : `${selectedNodes.length} node${selectedNodes.length > 1 ? 's' : ''} selected`
                }
              </p>
              <p className="text-xs text-zinc-400">
                Ready for job assignment
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, nodeId: '', nodeName: '' })}
        onConfirm={handleDeleteNode}
        title="Delete Node"
        message={(() => {
          const node = nodes.find(n => n.nodeId === deleteConfirm.nodeId);
          const isOffline = node?.status === 'offline';
          return `Are you sure you want to delete ${deleteConfirm.nodeName}? This action cannot be undone. ${
            isOffline 
              ? 'The node is offline and safe to delete.' 
              : '⚠️ WARNING: The node is currently online. Deleting an active node may cause job failures and data loss.'
          }`;
        })()}
        confirmText={(() => {
          const node = nodes.find(n => n.nodeId === deleteConfirm.nodeId);
          const isOffline = node?.status === 'offline';
          return isOffline ? 'Delete Node' : 'Force Delete Node';
        })()}
        confirmVariant="destructive"
        isLoading={deleting}
      />
    </div>
  );
}