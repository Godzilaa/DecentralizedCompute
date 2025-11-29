'use client';

import React from "react";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";

interface WalletProviderProps {
  children: React.ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      dappConfig={{
        network: Network.TESTNET,
        // Get your API key from: https://developers.aptoslabs.com/docs/api-access
      }}
      onError={(error) => {
        console.error("Wallet Adapter Error:", error);
      }}
      // Optional: uncomment to only allow specific wallets (e.g., Petra)
      optInWallets={["Petra"]}
      disableTelemetry={false}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
};