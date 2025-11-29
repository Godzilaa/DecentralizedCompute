'use client';

import { useState, useEffect } from 'react';
import { 
  Coins, 
  Shield, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { escrowService, octasToApt, aptToOctas } from '@/lib/aptos-escrow';

interface EscrowManagerProps {
  jobId: string;
  providerAddress: string;
  estimatedCost: number; // in APT
  onEscrowStatusChange?: (status: 'none' | 'deposited' | 'released' | 'refunded') => void;
}

export default function EscrowManager({ 
  jobId, 
  providerAddress, 
  estimatedCost, 
  onEscrowStatusChange 
}: EscrowManagerProps) {
  const { account, signAndSubmitTransaction, connected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [escrowStatus, setEscrowStatus] = useState<'none' | 'deposited' | 'released' | 'refunded'>('none');
  const [txHash, setTxHash] = useState<string>('');
  const [escrowAmount, setEscrowAmount] = useState<number>(estimatedCost);
  const [error, setError] = useState<string>('');
  const [gasEstimate, setGasEstimate] = useState<number>(0);

  useEffect(() => {
    if (connected && account) {
      checkEscrowStatus();
      estimateGasForDeposit();
    }
  }, [connected, account, jobId]);

  useEffect(() => {
    onEscrowStatusChange?.(escrowStatus);
  }, [escrowStatus, onEscrowStatusChange]);

  const checkEscrowStatus = async () => {
    if (!account) return;
    
    try {
      const escrowInfo = await escrowService.getEscrowInfo(account.address.toString(), jobId);
      if (escrowInfo) {
        setEscrowStatus('deposited');
      }
    } catch (error) {
      console.log('No escrow found - this is normal for new jobs');
    }
  };

  const estimateGasForDeposit = async () => {
    if (!account) return;
    
    try {
      const gas = await escrowService.estimateGas(
        'deposit',
        { jobId, providerAddress, amountApt: escrowAmount }
      );
      setGasEstimate(gas);
    } catch (error) {
      console.error('Error estimating gas:', error);
    }
  };

  const handleDepositEscrow = async () => {
    if (!connected || !account) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Log all parameters before calling
      console.log('Escrow deposit parameters:', {
        jobId,
        providerAddress,
        providerAddressLength: providerAddress.length,
        escrowAmount,
        accountAddress: account.address
      });
      
      const hash = await escrowService.depositToEscrow(
        signAndSubmitTransaction,
        jobId,
        providerAddress,
        escrowAmount
      );
      
      setTxHash(hash);
      setEscrowStatus('deposited');
      console.log('Escrow deposit successful:', hash);
    } catch (error: any) {
      console.error('Escrow deposit failed:', error);
      setError(error.message || 'Failed to deposit escrow');
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseEscrow = async () => {
    if (!connected || !account) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log(`Releasing escrow for job ${jobId}`);
      
      const hash = await escrowService.releaseEscrow(
        signAndSubmitTransaction,
        jobId
      );
      
      setTxHash(hash);
      setEscrowStatus('released');
      console.log('Escrow release successful:', hash);
    } catch (error: any) {
      console.error('Escrow release failed:', error);
      setError(error.message || 'Failed to release escrow');
    } finally {
      setLoading(false);
    }
  };

  const handleRefundEscrow = async () => {
    if (!connected || !account) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log(`Refunding escrow for job ${jobId}`);
      
      const hash = await escrowService.refundEscrow(
        signAndSubmitTransaction,
        jobId
      );
      
      setTxHash(hash);
      setEscrowStatus('refunded');
      console.log('Escrow refund successful:', hash);
    } catch (error: any) {
      console.error('Escrow refund failed:', error);
      setError(error.message || 'Failed to refund escrow');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (escrowStatus) {
      case 'deposited':
        return <Shield className="w-4 h-4 text-blue-400" />;
      case 'released':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'refunded':
        return <RefreshCw className="w-4 h-4 text-yellow-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (escrowStatus) {
      case 'deposited': return 'text-blue-400';
      case 'released': return 'text-green-400';
      case 'refunded': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = () => {
    switch (escrowStatus) {
      case 'deposited': return 'Escrow Active';
      case 'released': return 'Payment Released';
      case 'refunded': return 'Escrow Refunded';
      default: return 'No Escrow';
    }
  };

  if (!connected) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-gray-400" />
          <div>
            <h3 className="font-medium text-zinc-200">Escrow Payment</h3>
            <p className="text-sm text-zinc-400">Connect wallet to manage escrow</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-medium text-zinc-200">Escrow Payment</h3>
              <p className="text-sm text-zinc-400">Secure payment for compute job</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <Badge variant="outline" className={getStatusColor()}>
              {getStatusText()}
            </Badge>
          </div>
        </div>

        {/* Job & Payment Details */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Job ID:</span>
            <span className="text-zinc-200 font-mono">{jobId.slice(0, 12)}...</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Provider:</span>
            <span className="text-zinc-200 font-mono">{providerAddress.slice(0, 8)}...{providerAddress.slice(-6)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Amount:</span>
            <span className="text-zinc-200 font-medium">{escrowAmount} APT</span>
          </div>
          {gasEstimate > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Est. Gas:</span>
              <span className="text-zinc-200">{(gasEstimate / 100_000_000).toFixed(4)} APT</span>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-950/20 border border-red-500/20 rounded-md">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-400">Transaction Failed</p>
              <p className="text-xs text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Transaction Hash */}
        {txHash && (
          <div className="flex items-center gap-2 p-3 bg-green-950/20 border border-green-500/20 rounded-md">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-400">Transaction Successful</p>
              <div className="flex items-center gap-1 mt-1">
                <p className="text-xs text-green-300 font-mono">{txHash.slice(0, 16)}...</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-green-300 hover:text-green-200"
                  onClick={() => window.open(`https://explorer.aptoslabs.com/txn/${txHash}?network=testnet`, '_blank')}
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Amount Input */}
        {escrowStatus === 'none' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Escrow Amount (APT)</label>
            <input
              type="number"
              value={escrowAmount}
              onChange={(e) => setEscrowAmount(parseFloat(e.target.value) || 0)}
              step="0.01"
              min="0"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-zinc-200"
              placeholder="Enter amount in APT"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {escrowStatus === 'none' && (
            <Button
              onClick={handleDepositEscrow}
              disabled={loading || escrowAmount <= 0}
              className="flex-1 gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Depositing...
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4" />
                  Deposit Escrow
                </>
              )}
            </Button>
          )}

          {escrowStatus === 'deposited' && (
            <>
              <Button
                onClick={handleReleaseEscrow}
                disabled={loading}
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Releasing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Release Payment
                  </>
                )}
              </Button>
              <Button
                onClick={handleRefundEscrow}
                disabled={loading}
                variant="outline"
                className="flex-1 gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-zinc-400/20 border-t-zinc-400 rounded-full animate-spin" />
                    Refunding...
                  </>
                ) : (
                  <>
                    <ArrowDownLeft className="w-4 h-4" />
                    Refund
                  </>
                )}
              </Button>
            </>
          )}

          {(escrowStatus === 'released' || escrowStatus === 'refunded') && (
            <div className="flex-1 text-center text-sm text-zinc-400">
              Transaction completed
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}