'use client';

import React from "react";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { Network, Aptos, AptosConfig } from "@aptos-labs/ts-sdk";

interface WalletProviderProps {
  children: React.ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  // Create custom Aptos client with testnet fullnode (more stable than indexer API)
  const aptosConfig = new AptosConfig({ 
    network: Network.TESTNET,
    fullnode: "https://fullnode.testnet.aptoslabs.com/v1",
  });
  
  const aptos = new Aptos(aptosConfig);

  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      dappConfig={{
        network: Network.TESTNET,
        aptosConnectDappId: undefined, // Disable Aptos Connect to avoid ANS lookups
      }}
      onError={(error) => {
        console.error("Wallet Adapter Error:", error);
      }}
      optInWallets={["Petra"]}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
};