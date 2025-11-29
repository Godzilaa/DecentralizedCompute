'use client';

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut, User, Copy } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useWalletActions } from "@/components/wallet-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export const WalletButton = () => {
  const [isClient, setIsClient] = useState(false);
  const { connect, disconnect, account, connected, wallet, wallets } = useWallet();
  const { logout } = useWalletActions();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showWalletSelect, setShowWalletSelect] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const walletSelectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle click outside to close wallet selection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (walletSelectRef.current && !walletSelectRef.current.contains(event.target as Node)) {
        setShowWalletSelect(false);
      }
    };

    if (showWalletSelect) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showWalletSelect]);

  const handleConnect = async (walletName?: string) => {
    if (connected) return;
    
    setIsConnecting(true);
    try {
      if (wallets.length === 0) {
        throw new Error('No Aptos wallets detected. Please install Petra, Martian, or another Aptos wallet.');
      }
      
      // If specific wallet provided, use it; otherwise use first available
      const targetWallet = walletName || wallets[0].name;
      await connect(targetWallet);
      setShowWalletSelect(false);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      // Show user-friendly error
      alert(error instanceof Error ? error.message : 'Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleWalletSelect = () => {
    if (wallets.length <= 1) {
      handleConnect();
    } else {
      setShowWalletSelect(!showWalletSelect);
    }
  };

  const handleDisconnect = async () => {
    try {
      // Prefer centralized logout hook; fallback to direct disconnect
      if (logout) {
        await logout();
      } else {
        await disconnect();
      }
      // Clear balance state after disconnect
      setBalance(null);
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
      alert('Failed to disconnect wallet. Please try again.');
    }
  };

  const handleFundAccount = async () => {
    if (!account) return;
    
    setIsFunding(true);
    try {
      const normalizedAddress = normalizeAddress(account);
      console.log('Requesting testnet funding for:', normalizedAddress);
      
      // Request funds from Aptos testnet faucet
      const faucetUrl = 'https://faucet.testnet.aptoslabs.com/mint';
      const response = await fetch(faucetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: normalizedAddress,
          amount: 100000000, // 1 APT in octas
        }),
      });

      if (response.ok) {
        console.log('Successfully requested testnet funding');
        // Wait a moment then refresh balance
        setTimeout(() => {
          setBalance("Loading...");
          // The useEffect will automatically refresh the balance
        }, 2000);
      } else {
        console.error('Failed to request funding:', response.status, response.statusText);
        alert('Failed to request testnet funding. Please try the manual faucet.');
      }
    } catch (error) {
      console.error('Error funding account:', error);
      alert('Error requesting funds. Please use the manual faucet at https://faucet.testnet.aptoslabs.com');
    } finally {
      setIsFunding(false);
    }
  };

  // Add debugging log to inspect account data
  console.log("Wallet account data:", account);

  // Normalize address to proper hex string format
  const normalizeAddress = (address: any): string => {
    if (!address) return "";
    
    if (typeof address === "string") {
      return address.startsWith("0x") ? address : `0x${address}`;
    }
    
    if (address.data) {
      const hexString = Array.from(address.data)
        .map((byte) => (byte as number).toString(16).padStart(2, "0"))
        .join("");
      return `0x${hexString}`;
    }
    
    return "";
  };

  // Update truncateAddress function to handle missing addresses
  const truncateAddress = (address: any) => {
    const normalized = normalizeAddress(address);
    if (!normalized) {
      console.warn("Account address is missing or invalid:", address);
      return "Address not available";
    }
    return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
  };

  const handleCopyAddress = () => {
    if (account?.address) {
      const addressString = normalizeAddress(account.address);
      navigator.clipboard.writeText(addressString);
    }
  };

  const handleViewOnExplorer = () => {
    if (account?.address) {
      const addressString = normalizeAddress(account.address);
      window.open(`https://explorer.aptoslabs.com/account/${addressString}?network=testnet`, "_blank");
    }
  };

  useEffect(() => {
    const fetchBalance = async () => {
      if (connected && account?.address) {
        console.log("Fetching balance for account:", account);
        
        // Normalize address to proper hex string format
        let addressString = "";
        if (typeof account.address === "string") {
          addressString = account.address.startsWith("0x") ? account.address : `0x${account.address}`;
        } else if (account.address && account.address.data) {
          const hexString = Array.from(account.address.data)
            .map((byte) => (byte as number).toString(16).padStart(2, "0"))
            .join("");
          addressString = `0x${hexString}`;
        }
        
        if (!addressString) {
          console.error("Could not determine address string");
          setBalance(null);
          return;
        }
        
        console.log("Using address for balance fetch:", addressString);
        
        try {
          // Fetch account resources directly from Aptos testnet fullnode REST
          const url = `https://fullnode.testnet.aptoslabs.com/v1/accounts/${addressString}/resources`;
          console.log("Fetching from URL:", url);
          
          const res = await fetch(url);
          if (!res.ok) {
            console.error(`API request failed with status ${res.status}: ${res.statusText}`);
            throw new Error(`Failed to fetch resources: ${res.status}`);
          }
          
          const resources = await res.json();
          console.log("Fetched resources:", resources);
          
          const coinResource = resources.find(
            (r: any) => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
          );
          
          console.log("Coin resource found:", coinResource);
          
          if (coinResource && coinResource.data && coinResource.data.coin) {
            // Try multiple possible field names for the balance
            const coinData = coinResource.data.coin;
            console.log("Coin data structure:", coinData);
            
            let rawBalance = coinData.value || coinData.amount || coinData.balance || coinData;
            
            // Handle nested structure if needed
            if (typeof rawBalance === 'object' && rawBalance.value !== undefined) {
              rawBalance = rawBalance.value;
            }
            
            console.log("Raw balance value:", rawBalance, typeof rawBalance);
            
            const raw = typeof rawBalance === 'string' ? rawBalance : String(rawBalance);
            
            // Convert from octas (1 APT = 100,000,000 octas = 1e8 octas)
            const balanceInAPT = (parseInt(raw, 10) / 100000000).toFixed(4);
            console.log("Calculated balance:", balanceInAPT, "APT (from", raw, "octas)");
            setBalance(balanceInAPT);
          } else {
            console.log("No coin resource found or invalid structure. Available resources:", 
              resources.map((r: any) => r.type));
            
            // Try alternative approach - check if account has any APT at all
            try {
              const balanceUrl = `https://fullnode.testnet.aptoslabs.com/v1/accounts/${addressString}/resource/0x1::coin::CoinStore%3C0x1::aptos_coin::AptosCoin%3E`;
              console.log("Trying alternative balance fetch:", balanceUrl);
              
              const balanceRes = await fetch(balanceUrl);
              if (balanceRes.ok) {
                const balanceData = await balanceRes.json();
                console.log("Alternative balance data:", balanceData);
                
                if (balanceData.data && balanceData.data.coin) {
                  const coinData = balanceData.data.coin;
                  let rawBalance = coinData.value || coinData.amount || coinData.balance || coinData;
                  
                  if (typeof rawBalance === 'object' && rawBalance.value !== undefined) {
                    rawBalance = rawBalance.value;
                  }
                  
                  const raw = typeof rawBalance === 'string' ? rawBalance : String(rawBalance);
                  const balanceInAPT = (parseInt(raw, 10) / 100000000).toFixed(4);
                  console.log("Alternative method found balance:", balanceInAPT, "APT");
                  setBalance(balanceInAPT);
                } else {
                  setBalance("0.0000");
                }
              } else {
                console.log("Account exists but no APT balance found");
                setBalance("0.0000");
              }
            } catch (altErr) {
              console.log("Alternative balance fetch failed:", altErr);
              // Check if account exists but has no resources (needs funding)
              if (resources.length === 0) {
                console.log("Account exists but has no resources - needs to be funded from faucet");
                setBalance("Need Funding");
              } else {
                setBalance("0.0000");
              }
            }
          }
        } catch (err) {
          console.error("Failed to fetch balance:", err);
          setBalance("Error");
        }
      } else {
        console.log("Not connected or no account address");
        setBalance(null);
      }
    };
    
    fetchBalance();
    
    // Set up periodic balance refresh every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [connected, account]);

  // Show loading state on server side
  if (!isClient) {
    return (
      <Button variant="outline" className="flex items-center gap-2" disabled>
        <Wallet className="h-4 w-4" />
        Loading...
      </Button>
    );
  }

  if (!connected) {
    return (
      <div className="relative" ref={walletSelectRef}>
        <Button
          onClick={handleWalletSelect}
          disabled={isConnecting || wallets.length === 0}
          className="flex items-center gap-2"
          variant="outline"
          title={wallets.length === 0 ? "No Aptos wallets detected" : "Connect wallet"}
        >
          <Wallet className="h-4 w-4" />
          {isConnecting ? "Connecting..." : wallets.length === 0 ? "No Wallets" : "Connect Wallet"}
        </Button>
        
        {showWalletSelect && wallets.length > 1 && (
          <div className="absolute top-full mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg z-50">
            <div className="p-2">
              <p className="text-xs text-zinc-400 mb-2">Select a wallet:</p>
              {wallets.map((walletOption) => (
                <button
                  key={walletOption.name}
                  onClick={() => handleConnect(walletOption.name)}
                  disabled={isConnecting}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 rounded-md flex items-center gap-2 transition-colors"
                >
                  {walletOption.icon && (
                    <img 
                      src={walletOption.icon} 
                      alt={walletOption.name}
                      className="w-4 h-4"
                      onError={(e) => {
                        // Hide broken images
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  {walletOption.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          {connected && account?.address ? (
            <>
              {truncateAddress(account.address)}
              {balance !== null && (
                balance === "Need Funding" ? (
                  <Badge variant="warning" className="ml-2 cursor-pointer" onClick={handleFundAccount}>
                    {isFunding ? "Funding..." : "Fund Account"}
                  </Badge>
                ) : (
                  <Badge variant="success" className="ml-2">{balance} APT</Badge>
                )
              )}
            </>
          ) : (
            "Connect Wallet"
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex flex-col space-y-1 p-2">
          <p className="text-sm font-medium">Connected to {wallet?.name}</p>
          {account?.address && (
            <p className="text-xs text-muted-foreground font-mono">
              {truncateAddress(account.address)}
            </p>
          )}
          {balance !== null && (
            balance === "Need Funding" ? (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2" 
                onClick={handleFundAccount}
                disabled={isFunding}
              >
                {isFunding ? "Funding..." : "Fund Account from Faucet"}
              </Button>
            ) : (
              <Badge variant="success" className="mt-2">Balance: {balance} APT</Badge>
            )
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopyAddress}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleViewOnExplorer}>
          <Wallet className="mr-2 h-4 w-4" />
          View on Explorer
        </DropdownMenuItem>
        {balance === "Need Funding" && (
          <DropdownMenuItem onClick={() => window.open('https://faucet.testnet.aptoslabs.com', '_blank')}>
            <Wallet className="mr-2 h-4 w-4" />
            Manual Faucet
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setShowDisconnectConfirm(true)} className="text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    {/* Disconnect confirmation modal */}
    {showDisconnectConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60" onClick={() => setShowDisconnectConfirm(false)} />
        <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-md p-4 z-10">
          <h3 className="text-lg font-medium">Disconnect Wallet</h3>
          <p className="text-sm text-zinc-400 mt-2">Are you sure you want to disconnect your wallet?</p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              className="px-3 py-1.5 text-sm rounded-md border border-zinc-700 hover:bg-zinc-800"
              onClick={() => setShowDisconnectConfirm(false)}
            >
              Cancel
            </button>
            <button
              className="px-3 py-1.5 text-sm rounded-md bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                setShowDisconnectConfirm(false);
                await handleDisconnect();
              }}
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};