import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useConnection } from 'wagmi';
import { targetChain } from '@cipherquiz/blockchain';
import { useQuery } from '@tanstack/react-query';
import { DISCLAIMER, type HealthResponse } from '@cipherquiz/shared';
import {
  ArrowUpRight,
  FlaskConical,
  Menu,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Logo } from './Logo';
import { Button } from './ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { WalletDialog } from './WalletDialog';

export function Layout() {
  const [walletOpen, setWalletOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  const { address, isConnected, chainId } = useConnection();
  const wrongNetwork = isConnected && chainId !== targetChain.id;
  const isHome = location.pathname === '/';
  const isQuiz = location.pathname === '/play';
  const health = useQuery({
    queryKey: ['api-health'],
    queryFn: async () => {
      const response = await fetch('/health/live', {
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) throw new Error('API unavailable');
      const result: HealthResponse = await response.json();
      if (result.service !== 'cipherquiz-api' || result.status !== 'ok')
        throw new Error('API unavailable');
      return result;
    },
    retry: false,
    refetchInterval: 30000,
  });
  useEffect(() => {
    setMenuOpen(false);
    if (location.hash) {
      requestAnimationFrame(() =>
        document.getElementById(location.hash.slice(1))?.scrollIntoView(),
      );
    } else {
      window.scrollTo(0, 0);
      main.current?.focus({ preventScroll: true });
    }
    const names: Record<string, string> = {
      '/': 'Confidential trivia',
      '/how-it-works': 'How it works',
      '/dashboard': 'Your playroom',
      '/categories': 'Choose a category',
      '/play': 'Practice round',
      '/results': 'Your result',
      '/leaderboard': 'Leaderboard',
      '/profile': 'Player profile',
    };
    document.title = `${names[location.pathname] ?? 'Page not found'} | CipherQuiz`;
  }, [location.pathname, location.hash]);
  const links = [
    { to: '/', name: 'Home' },
    { to: '/how-it-works', name: 'How It Works' },
    { to: '/dashboard', name: 'Play' },
    { to: '/categories', name: 'Categories' },
    { to: '/leaderboard', name: 'Leaderboard' },
    { to: '/profile', name: 'Profile' },
  ];
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <div className="container nav-inner">
          {isQuiz ? (
            <Logo />
          ) : (
            <Link to="/" aria-label="CipherQuiz home">
              <Logo />
            </Link>
          )}
          {!isQuiz && (
            <nav className="desktop-nav" aria-label="Main navigation">
              {links.map((link) => (
                <NavLink key={link.name} to={link.to} end={link.to === '/'}>
                  {link.name}
                </NavLink>
              ))}
            </nav>
          )}
          <div className="nav-actions">
            <span className="network-label">
              <span
                className={`status-dot ${!isConnected || wrongNetwork ? 'dot-offline' : ''}`}
              />{' '}
              {wrongNetwork ? 'Wrong network' : 'Sepolia testnet'}
            </span>
            <Button
              variant="outline"
              className="wallet-button"
              onClick={() => setWalletOpen(true)}
              aria-label={
                isConnected ? 'Manage connected wallet' : 'Connect wallet'
              }
            >
              <Wallet size={16} />
              <span className="wallet-label">
                {isConnected
                  ? `${address?.slice(0, 6)}…${address?.slice(-4)}`
                  : 'Connect wallet'}
              </span>
            </Button>
            {!isQuiz && (
              <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mobile-menu-trigger"
                    aria-label="Open navigation menu"
                  >
                    <Menu />
                  </Button>
                </DialogTrigger>
                <DialogContent className="mobile-menu">
                  <DialogTitle>Make room for curiosity.</DialogTitle>
                  <DialogDescription>Explore CipherQuiz</DialogDescription>
                  <nav aria-label="Mobile navigation">
                    {links.map((link) => (
                      <DialogClose asChild key={link.name}>
                        <Link to={link.to}>
                          {link.name}
                          <ArrowUpRight size={18} />
                        </Link>
                      </DialogClose>
                    ))}
                  </nav>
                  <Button
                    onClick={() => {
                      setMenuOpen(false);
                      setWalletOpen(true);
                    }}
                  >
                    <Wallet /> Connect wallet
                  </Button>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </header>
      {!isHome && (
        <div className="practice-strip">
          <div className="container">
            <FlaskConical size={14} />
            <span>
              Practice mode{' '}
              <span className="strip-detail">
                · No real stakes, encryption or payouts
              </span>
            </span>
            {!isQuiz && (
              <Link to="/how-it-works#confidentiality">
                About confidentiality <ArrowUpRight size={12} />
              </Link>
            )}
          </div>
        </div>
      )}
      <main id="main-content" ref={main} tabIndex={-1}>
        <Outlet />
      </main>
      {!isQuiz && (
        <footer className={`site-footer ${isHome ? 'site-footer-home' : ''}`}>
          <div className="container">
            <div className="footer-main">
              <div>
                <Link to="/" aria-label="CipherQuiz home">
                  <Logo />
                </Link>
                <p>
                  A little knowledge.
                  <br />A different kind of game.
                </p>
              </div>
              <div className="footer-links">
                <Link to="/dashboard">
                  Play a round <ArrowUpRight size={14} />
                </Link>
                <Link to="/how-it-works">How It Works</Link>
                <Link to="/categories">Categories</Link>
                <Link to="/leaderboard">Leaderboard</Link>
                <Link to="/how-it-works#confidentiality">Confidentiality</Link>
                <Link to="/profile">Profile</Link>
              </div>
              <div className="footer-note">
                <ShieldCheck size={22} />
                <p>
                  Built for curious minds.
                  <br />
                  Designed for a more private web.
                </p>
                <span className="badge">Independent project</span>
              </div>
            </div>
            <div className="footer-bottom">
              <p>{DISCLAIMER}</p>
              <div className="api-state" role="status">
                <span
                  className={`status-dot ${health.isError ? 'dot-offline' : ''}`}
                />
                {health.isPending ? (
                  <span
                    className="skeleton skeleton-text"
                    aria-label="Checking API"
                  />
                ) : health.isError ? (
                  'API offline · practice available'
                ) : (
                  'API online'
                )}
                {health.isError && (
                  <button
                    onClick={() => void health.refetch()}
                    aria-label="Retry API connection"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
            <p className="copyright">
              © {new Date().getFullYear()} CipherQuiz. Stay curious. Play
              thoughtfully.
            </p>
          </div>
        </footer>
      )}
      <WalletDialog open={walletOpen} onOpenChange={setWalletOpen} />
    </>
  );
}
