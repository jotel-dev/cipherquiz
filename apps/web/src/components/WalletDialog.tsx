import { useEffect, useState } from 'react';
import {
  useConnect,
  useConnectors,
  useConnection,
  useDisconnect,
  useSwitchChain,
} from 'wagmi';
import { targetChain } from '@cipherquiz/blockchain';
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  LogOut,
  ShieldCheck,
  Wallet,
  WifiOff,
} from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from './ui/dialog';

export function WalletDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const connection = useConnection();
  const connect = useConnect();
  const connectors = useConnectors();
  const disconnect = useDisconnect();
  const switchChain = useSwitchChain();
  const [available, setAvailable] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  useEffect(() => {
    if (open) {
      setAvailable('ethereum' in window);
      setCopied(false);
      setCopyError(false);
      connect.reset();
      switchChain.reset();
    }
  }, [open]); // Only reset on opening, not mutation updates.
  const wrongChain =
    connection.isConnected && connection.chainId !== targetChain.id;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="dialog-symbol">
          <Wallet />
        </div>
        <p className="eyebrow">YOUR CONNECTION</p>
        <DialogTitle>
          {connection.isConnected
            ? 'A wallet. Your identity.'
            : 'Bring your own wallet.'}
        </DialogTitle>
        <DialogDescription>
          Connect an Ethereum browser wallet to Sepolia. Practice is available
          with or without a wallet.
        </DialogDescription>
        {connection.isConnected ? (
          <>
            <div className="wallet-address">
              <span className="status-dot" />
              <code>
                {connection.address?.slice(0, 8)}…
                {connection.address?.slice(-6)}
              </code>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Copy wallet address"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      connection.address ?? '',
                    );
                    setCopied(true);
                  } catch {
                    setCopyError(true);
                  }
                }}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
            {copied && (
              <p className="small muted" role="status">
                Address copied.
              </p>
            )}
            {copyError && (
              <p className="error-note" role="alert">
                Clipboard unavailable. Copy your address from your wallet.
              </p>
            )}
            <div
              className={`notice ${wrongChain ? 'notice-warning' : 'notice-success'}`}
            >
              <ShieldCheck />
              <div>
                <strong>
                  {wrongChain ? 'Switch to Sepolia' : 'Connected to Sepolia'}
                </strong>
                <p>
                  {wrongChain
                    ? 'Your wallet is on an unsupported network.'
                    : 'Test network · no mainnet funds are used.'}
                </p>
              </div>
            </div>
            {wrongChain && (
              <Button
                className="full-width"
                disabled={switchChain.isPending}
                onClick={() => switchChain.mutate({ chainId: targetChain.id })}
              >
                {switchChain.isPending ? (
                  <>
                    <span className="loader" /> Check your wallet…
                  </>
                ) : (
                  'Switch network'
                )}
              </Button>
            )}
            <Button
              variant="outline"
              className="full-width"
              onClick={() => {
                disconnect.mutate({});
                connect.reset();
                switchChain.reset();
              }}
            >
              <LogOut /> Disconnect wallet
            </Button>
          </>
        ) : (
          <>
            {available ? (
              connectors.map((connector) => (
                <Button
                  className="full-width wallet-option"
                  variant="outline"
                  key={connector.uid}
                  disabled={connect.isPending}
                  onClick={() =>
                    connect.mutate({ connector, chainId: targetChain.id })
                  }
                >
                  <Wallet />
                  <span>
                    {connect.isPending
                      ? 'Waiting for your wallet…'
                      : `Connect ${connector.name}`}
                  </span>
                  {connect.isPending ? (
                    <span className="loader" />
                  ) : (
                    <ArrowRight />
                  )}
                </Button>
              ))
            ) : (
              <div className="notice">
                <WifiOff />
                <div>
                  <strong>No browser wallet found</strong>
                  <p>
                    Open this page in a wallet’s browser, or install an Ethereum
                    browser wallet. You can still play a practice round.
                  </p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              className="full-width"
              onClick={() => onOpenChange(false)}
            >
              Continue without a wallet <ArrowRight />
            </Button>
          </>
        )}
        {(connect.isError || switchChain.isError) && (
          <div className="notice notice-error" role="alert">
            <WifiOff />
            <div>
              <strong>Connection wasn’t completed</strong>
              <p>
                Your wallet may have declined the request. Try again when you’re
                ready.
              </p>
            </div>
          </div>
        )}
        <div className="dialog-footnote">
          <ShieldCheck size={16} />
          <p>
            Wallet connection is live. Onchain rounds, encrypted scoring and
            payouts are not connected to this frontend.
          </p>
        </div>
        <a
          className="text-link small"
          href="https://ethereum.org/en/wallets/"
          target="_blank"
          rel="noreferrer"
        >
          New to wallets? <ExternalLink size={13} />
        </a>
      </DialogContent>
    </Dialog>
  );
}
