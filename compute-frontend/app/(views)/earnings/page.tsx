'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  Server, 
  Clock, 
  DollarSign,
  Activity,
  Eye,
  ExternalLink,
  Copy,
  CheckCircle,
  AlertCircle,
  Filter,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useNodes, api, type Node } from '@/lib/api';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

interface Payment {
  id: string;
  jobId: string;
  nodeId: string;
  amount: number;
  currency: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  txHash?: string;
  jobType: string;
  duration: number;
}

interface EarningsStats {
  totalEarned: number;
  todayEarned: number;
  weeklyEarned: number;
  monthlyEarned: number;
  totalJobs: number;
  activeNodes: number;
  averageJobDuration: number;
  estimatedMonthly: number;
}

/**
 * Renter Earnings Dashboard - Shows payments received for compute resources
 */
export default function EarningsPage() {
  const { account, connected } = useWallet();
  const [isClient, setIsClient] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [useManualKey, setUseManualKey] = useState(false);
  const [earnings, setEarnings] = useState<EarningsStats | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [userNodes, setUserNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending'>('all');
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'all'>('month');
  
  // Normalize address to a string (handles string, Uint8Array, Buffer-like objects)
  const addressToHex = (address: any): string => {
    if (!address) return '';
    // If already a string, return as-is
    if (typeof address === 'string') return address;

    // If it's a Uint8Array or an Array of numbers
    const asArray =
      address instanceof Uint8Array ? Array.from(address) :
      Array.isArray(address) ? address :
      // Some libs wrap bytes under a `.data` property
      address && typeof address === 'object' && (Array.isArray(address.data) || address.data instanceof Uint8Array)
        ? Array.from(address.data)
        : null;

    if (asArray && asArray.length > 0) {
      const hex = asArray.map((b: any) => (Number(b) & 0xff).toString(16).padStart(2, '0')).join('');
      return hex.startsWith('0x') ? hex : `0x${hex}`;
    }

    // Fallback to toString
    try {
      return String(address);
    } catch {
      return '';
    }
  };

  const truncateHex = (addr: string, start = 8, end = 6) => {
    if (!addr) return '';
    // Ensure string
    const s = String(addr);
    if (s.length <= start + end) return s;
    return `${s.slice(0, start)}...${s.slice(-end)}`;
  };

  const normalizedAddress = addressToHex(account?.address);
  const aptosPublicKey = useManualKey ? manualKey : (connected && normalizedAddress ? normalizedAddress : '');

  useEffect(() => {
    setIsClient(true);
  }, []);


  const { nodes } = useNodes();

  const fetchEarningsByPublicKey = useCallback(async (publicKey: string) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch real earnings data
      const [earningsResult, paymentsResult] = await Promise.all([
        api.getEarningsByPublicKey(publicKey),
        api.getPaymentsByPublicKey(publicKey)
      ]);

      setEarnings(earningsResult);
      // Ensure payments conform to the expected Payment['status'] union
      const normalizedPayments = (paymentsResult.payments || []).map((p: any) => ({
        ...p,
        status: (p.status === 'pending' || p.status === 'completed' || p.status === 'failed') ? p.status : 'pending'
      } as Payment));
      setPayments(normalizedPayments);

      // Filter nodes belonging to this public key
      const filteredNodes = nodes.filter(node => 
        node.specs && (node.specs as any).aptosPublicKey === publicKey
      );
      setUserNodes(filteredNodes);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch earnings');
    
      setUserNodes(nodes.slice(0, 3));
    } finally {
      setLoading(false);
    }
  }, [nodes]);

  useEffect(() => {
    if (isClient && aptosPublicKey) {
      fetchEarningsByPublicKey(aptosPublicKey);
    }
  }, [isClient, aptosPublicKey, nodes, fetchEarningsByPublicKey]);

  // Auto-fetch when wallet connects
  useEffect(() => {
    if (isClient && connected && normalizedAddress && !useManualKey) {
      fetchEarningsByPublicKey(normalizedAddress);
    }
  }, [isClient, connected, normalizedAddress, useManualKey, fetchEarningsByPublicKey]);

  const handleConnect = () => {
    if (aptosPublicKey.trim()) {
      fetchEarningsByPublicKey(aptosPublicKey);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatCurrency = (amount: number, currency: string = 'PHOTON') => {
    return `${amount.toFixed(2)} ${currency}`;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getStatusBadge = (status: Payment['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/20">Completed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/20">Pending</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/20">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const filteredPayments = payments.filter(payment => {
    if (filterStatus !== 'all' && payment.status !== filterStatus) return false;
    
    const now = Date.now();
    const paymentTime = payment.timestamp;
    
    switch (timeFilter) {
      case 'week':
        return (now - paymentTime) <= 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return (now - paymentTime) <= 30 * 24 * 60 * 60 * 1000;
      case 'all':
      default:
        return true;
    }
  });

  // Show loading state on server side
  if (!isClient) {
    return (
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto text-center space-y-6 mt-20">
          <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-blue-500 rounded-full flex items-center justify-center mx-auto">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white mb-2">Loading...</h2>
            <p className="text-zinc-400">Initializing wallet connection</p>
          </div>
        </div>
      </div>
    );
  }

  if (!aptosPublicKey || !earnings) {
    return (
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto text-center space-y-6 mt-20">
          <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-blue-500 rounded-full flex items-center justify-center mx-auto">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          
          <div>
            <h2 className="text-2xl font-semibold text-white mb-2">
              {connected ? 'Loading Earnings...' : 'Connect Your Wallet'}
            </h2>
            <p className="text-zinc-400">
              {connected 
                ? 'Fetching earnings data for your connected wallet'
                : 'Connect your wallet or manually enter your Aptos public key to view earnings'
              }
            </p>
            {connected && normalizedAddress && (
              <p className="text-xs text-zinc-500 font-mono mt-2">
                Connected: {truncateHex(normalizedAddress)}
              </p>
            )}
          </div>
          
          {!connected && (
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-zinc-300">
                    Manual Entry
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUseManualKey(!useManualKey)}
                  >
                    {useManualKey ? 'Cancel' : 'Enter Manually'}
                  </Button>
                </div>
                
                {useManualKey && (
                  <>
                    <input
                      type="text"
                      value={manualKey}
                      onChange={(e) => setManualKey(e.target.value)}
                      placeholder="0x1234...abcd"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-4 py-3 text-zinc-200 font-mono"
                    />
                    
                    <Button 
                      onClick={() => fetchEarningsByPublicKey(manualKey)}
                      disabled={!manualKey.trim() || loading}
                      className="w-full gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Wallet className="w-4 h-4" />
                          View Earnings
                        </>
                      )}
                    </Button>
                  </>
                )}
                
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-950/20 border border-red-500/20 rounded-md">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}
              </div>
            </Card>
          )}
          
          {loading && (
            <div className="flex items-center justify-center gap-2 text-zinc-400">
              <div className="w-4 h-4 border-2 border-zinc-400/20 border-t-zinc-400 rounded-full animate-spin" />
              Fetching your earnings data...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">Earnings Dashboard</h2>
          <p className="text-zinc-400">Track payments received from your compute nodes</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-zinc-500 font-mono">{aptosPublicKey.slice(0, 8)}...{aptosPublicKey.slice(-6)}</span>
            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(aptosPublicKey)}>
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            if (connected) {
              setUseManualKey(true);
              setManualKey('');
            } else {
              setUseManualKey(false);
              setManualKey('');
            }
            setEarnings(null);
            setPayments([]);
            setUserNodes([]);
          }}>
            {connected ? 'Use Manual Key' : 'Change Wallet'}
          </Button>
        </div>
      </div>

      {/* Earnings Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex justify-between items-start">
            <span className="text-zinc-500 text-sm font-medium">Total Earned</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-medium text-emerald-400">
              {formatCurrency(earnings.totalEarned)}
            </span>
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-start">
            <span className="text-zinc-500 text-sm font-medium">Today</span>
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-medium text-blue-400">
              {formatCurrency(earnings.todayEarned)}
            </span>
            <span className="text-xs text-zinc-600 font-mono">+12.5%</span>
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-start">
            <span className="text-zinc-500 text-sm font-medium">This Month</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-medium text-purple-400">
              {formatCurrency(earnings.monthlyEarned)}
            </span>
            <span className="text-xs text-zinc-600 font-mono">Est: {formatCurrency(earnings.estimatedMonthly)}</span>
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-start">
            <span className="text-zinc-500 text-sm font-medium">Active Nodes</span>
            <Server className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-medium text-white">
              {earnings.activeNodes}
            </span>
            <span className="text-xs text-zinc-600 font-mono">{earnings.totalJobs} jobs</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment History */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-zinc-200">Payment History</h3>
            <div className="flex gap-2">
              <select 
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as any)}
                className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-300"
              >
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="all">All Time</option>
              </select>
              
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-300"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-medium">
                <tr>
                  <th className="px-4 py-3">Job ID</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                      No payments found for selected filters
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-zinc-300">
                        {payment.jobId}
                      </td>
                      <td className="px-4 py-3 font-medium text-emerald-400">
                        {formatCurrency(payment.amount, payment.currency)}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {formatDuration(payment.duration)}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        {formatTime(payment.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1">
                          {payment.txHash && (
                            <Button variant="ghost" size="sm" title="View Transaction">
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" title="View Job Details">
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Your Nodes */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-zinc-200">Your Nodes</h3>
          <div className="space-y-3">
            {userNodes.map((node) => (
              <Card key={node.nodeId} className="group hover:border-zinc-600 transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${node.status === 'online' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className="text-sm font-medium text-zinc-300">
                      {node.nodeId.slice(0, 12)}...
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {node.status.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Earned Today</span>
                    <span className="text-emerald-400 font-mono">
                      {formatCurrency(Math.random() * 20 + 5)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Jobs Completed</span>
                    <span className="text-zinc-300">{Math.floor(Math.random() * 10 + 5)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Utilization</span>
                    <span className="text-zinc-300">{node.specs.cpuUsage.toFixed(0)}%</span>
                  </div>
                </div>
                
                <div className="mt-3 pt-2 border-t border-zinc-800">
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Region: {node.region}</span>
                    <span>{node.uptime} uptime</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}