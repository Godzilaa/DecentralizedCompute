/**
 * Aptos Escrow Contract Integration
 * Contract Address: 0x2a110b4e8c726476ef36d587e2a5ac46d12a77960e13970b28078696d7de938e
 */

import { APTOS_ESCROW_CONTRACT } from './constants';
import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";

// 🔒 Validate contract address immediately
const CONTRACT_ADDR = APTOS_ESCROW_CONTRACT.trim();
if (!CONTRACT_ADDR.startsWith("0x") || CONTRACT_ADDR.length !== 66) {
  throw new Error(
    `Invalid ESCROW contract address. Expected 66 chars (0x + 64 hex), got: "${CONTRACT_ADDR}" (${CONTRACT_ADDR.length} chars)`
  );
}
if (!/^[0-9a-f]+$/i.test(CONTRACT_ADDR.slice(2))) {
  throw new Error("Contract address contains non-hex characters");
}

export const ESCROW_CONTRACT_ADDRESS = CONTRACT_ADDR;
export const APTOS_NODE_URL = "https://fullnode.testnet.aptoslabs.com/v1";

export const ESCROW_FUNCTIONS = {
  DEPOSIT_TO_ESCROW: `${ESCROW_CONTRACT_ADDRESS}::apex_payments::deposit_to_escrow`,
  RELEASE_ESCROW: `${ESCROW_CONTRACT_ADDRESS}::apex_payments::release_escrow`,
  REFUND_ESCROW: `${ESCROW_CONTRACT_ADDRESS}::apex_payments::refund_escrow`,
};

// Helper: string → vector<u8> (number[])
const stringToBytes = (str: string): number[] => Array.from(new TextEncoder().encode(str));

export class AptosEscrowService {
  async depositToEscrow(
    signAndSubmitTransaction: (tx: InputTransactionData) => Promise<any>,
    jobId: string,
    providerAddress: string,
    amountApt: number
  ): Promise<string> {
    // Validate inputs
    if (!providerAddress || typeof providerAddress !== 'string') {
      throw new Error('Invalid provider address: must be a non-empty string');
    }
    
    // Normalize provider address
    let normalizedAddress = providerAddress.trim().toLowerCase();
    if (!normalizedAddress.startsWith('0x')) {
      normalizedAddress = '0x' + normalizedAddress;
    }
    // Remove 0x prefix, pad to 64 chars, add back 0x
    const hexPart = normalizedAddress.slice(2).padStart(64, '0');
    normalizedAddress = '0x' + hexPart;

    console.log('Transaction params:', {
      jobId,
      jobIdBytes: stringToBytes(jobId),
      originalProviderAddress: providerAddress,
      normalizedProviderAddress: normalizedAddress,
      amountApt,
      amountOctas: Math.floor(amountApt * 100_000_000)
    });

    const amountOctas = Math.floor(amountApt * 100_000_000);
    const jobIdBytes = stringToBytes(jobId);

    console.log('About to submit transaction with:', {
      function: ESCROW_FUNCTIONS.DEPOSIT_TO_ESCROW,
      jobIdBytes,
      normalizedAddress,
      normalizedAddressLength: normalizedAddress.length,
      amountOctas,
      amountOctasType: typeof amountOctas
    });

    const tx: InputTransactionData = {
      data: {
        function: ESCROW_FUNCTIONS.DEPOSIT_TO_ESCROW as `${string}::${string}::${string}`,
        functionArguments: [jobIdBytes, normalizedAddress, amountOctas],
      },
    };

    try {
      const res = await signAndSubmitTransaction(tx);
      return res.hash;
    } catch (err) {
      console.error('Transaction submission error:', err);

      // Normalize common Move abort / simulation errors so the UI can react
      let msg = '';
      if (err !== null && err !== undefined) {
        if (typeof err === 'string') {
          msg = err;
        } else if (typeof err === 'object') {
          const maybeErr = err as { message?: unknown; toString?: () => string };
          if (typeof maybeErr.message === 'string') {
            msg = maybeErr.message;
          } else if (typeof maybeErr.toString === 'function') {
            try {
              msg = maybeErr.toString();
            } catch {
              msg = String(err);
            }
          } else {
            msg = String(err);
          }
        } else {
          msg = String(err);
        }
      }
      // Detect the specific abort signature we observed in the UI: "Move abort 0x1" or contract-specific code
      if (typeof msg === 'string' && (msg.includes('Move abort 0x1') || msg.includes('E_ESCROW_EXISTS') || /E_ESCROW_EXISTS/i.test(msg))) {
        // Throw a clearer, typed error for the UI to detect
        const e: any = new Error('Escrow already exists for this job (E_ESCROW_EXISTS)');
        e.code = 'E_ESCROW_EXISTS';
        throw e;
      }

      // Fall back to rethrowing original
      throw err;
    }
  }

  async releaseEscrow(
    signAndSubmitTransaction: (tx: InputTransactionData) => Promise<any>,
    jobId: string
  ): Promise<string> {
    const tx: InputTransactionData = {
      data: {
        function: ESCROW_FUNCTIONS.RELEASE_ESCROW as `${string}::${string}::${string}`,
        functionArguments: [stringToBytes(jobId)],
      },
    };
    const res = await signAndSubmitTransaction(tx);
    return res.hash;
  }

  async refundEscrow(
    signAndSubmitTransaction: (tx: InputTransactionData) => Promise<any>,
    jobId: string
  ): Promise<string> {
    const tx: InputTransactionData = {
      data: {
        function: ESCROW_FUNCTIONS.REFUND_ESCROW as `${string}::${string}::${string}`,
        functionArguments: [stringToBytes(jobId)],
      },
    };
    const res = await signAndSubmitTransaction(tx);
    return res.hash;
  }

  async getEscrowInfo(renterAddress: string, jobId: string): Promise<any> {
    // Placeholder - would query contract state
    console.log('Checking escrow for:', renterAddress, jobId);
    return null;
  }

  async estimateGas(operation: 'deposit' | 'release' | 'refund', params: any): Promise<number> {
    // Return estimated gas cost in octas
    return 1000; // ~0.00001 APT
  }
}

export const escrowService = new AptosEscrowService();

// Utility functions
export function aptToOctas(apt: number): string {
  return Math.floor(apt * 100_000_000).toString();
}

export function octasToApt(octas: string | number): number {
  return parseInt(octas.toString()) / 100_000_000;
}