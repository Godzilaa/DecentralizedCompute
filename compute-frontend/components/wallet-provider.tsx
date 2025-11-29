'use client';

import { AptosWalletAdapterProvider, useWallet } from "@aptos-labs/wallet-adapter-react";
import { PropsWithChildren, createContext, useContext, useEffect, useState } from "react";
import { Network } from "@aptos-labs/ts-sdk";

type WalletActions = {
  logout: () => Promise<void>;
};

const WalletActionsContext = createContext<WalletActions | undefined>(undefined);

export const useWalletActions = () => {
  const ctx = useContext(WalletActionsContext);
  if (!ctx) throw new Error('useWalletActions must be used within WalletProvider');
  return ctx;
};

const WalletActionsBridge = ({ children }: PropsWithChildren) => {
  const { disconnect } = useWallet();

  const logout = async () => {
    try {
      await disconnect();
    } catch (err) {
      console.error('Failed to disconnect wallet:', err);
    }
  };

  return (
    <WalletActionsContext.Provider value={{ logout }}>
      {children}
    </WalletActionsContext.Provider>
  );
};

export const WalletProvider = ({ children }: PropsWithChildren) => {
  return (
    <AptosWalletAdapterProvider
      autoConnect={false}
      dappConfig={{
        network: Network.TESTNET,
        aptosApiKeys: {
          testnet: process.env.NEXT_PUBLIC_APTOS_API_KEY_TESTNET,
        }
      }}
      onError={(error) => {
        console.error("Wallet adapter error:", error);
      }}
    >
      <WalletActionsBridge>
        {children}
      </WalletActionsBridge>
    </AptosWalletAdapterProvider>
  );
};

export default WalletActionsContext;