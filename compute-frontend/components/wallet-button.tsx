'use client';

import React, { useEffect, useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Button } from "./ui/button";

export const WalletButton: React.FC = () => {
  const { connect, disconnect, connected, wallet, wallets } = useWallet();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <Button disabled>
        Loading...
      </Button>
    );
  }

  if (!connected) {
    return (
      <div className="flex gap-2">
        {wallets && wallets.length > 0 ? (
          wallets.map((w) => {
            const isInstalled = w.readyState === "Installed" || w.readyState === "Loadable";
            return (
              <Button
                key={w.name}
                onClick={() => {
                  try {
                    connect(w.name);
                  } catch (error) {
                    console.error("Failed to connect wallet:", error);
                  }
                }}
                disabled={!isInstalled}
                className="flex items-center gap-2"
              >
                {w.icon && <img src={w.icon} alt={`${w.name} icon`} className="w-5 h-5" />}
                {isInstalled ? `Connect ${w.name}` : `Install ${w.name}`}
              </Button>
            );
          })
        ) : (
          <p className="text-sm text-gray-500">
            No wallets detected. Install Petra or Pontem.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-400">{wallet?.name || "Connected"}</span>
      <Button 
        onClick={() => {
          try {
            disconnect();
          } catch (error) {
            console.error("Failed to disconnect wallet:", error);
          }
        }} 
        variant="outline" 
        size="sm"
      >
        Disconnect
      </Button>
    </div>
  );
};