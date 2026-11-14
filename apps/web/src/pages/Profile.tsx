import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useConnection } from 'wagmi';
import {
  ArrowRight,
  Check,
  Pencil,
  ShieldCheck,
  Trash2,
  UserRound,
  Wallet,
} from 'lucide-react';
import { useGame } from '../game/context';
import { PageHeading } from '../components/PageHeading';
import { RoundHistory } from '../components/RoundHistory';
import { Button } from '../components/ui/button';
import { WalletDialog } from '../components/WalletDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../components/ui/dialog';

export function Profile() {
  const game = useGame();
  const connection = useConnection();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(game.playerName);
  const [saved, setSaved] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const rounds = game.history.filter(
    (round) => filter === 'all' || round.score >= 7,
  );
  return (
    <div className="container app-page">
      <PageHeading
        eyebrow="YOUR OWN LITTLE CORNER"
        title="Every mind has a story."
      />
      <div className="profile-layout">
        <aside className="panel profile-card">
          <div className="profile-avatar">
            <UserRound strokeWidth={1.2} />
          </div>
          <h2>{game.playerName}</h2>
          <span className="badge">Practice explorer</span>
          <p>
            Collecting questions.
            <br />
            Finding new perspectives.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setName(game.playerName);
              setEditing(true);
            }}
          >
            <Pencil size={14} /> Edit display name
          </Button>
          {saved && (
            <p role="status" className="small saved-note">
              <Check size={13} /> Name updated for this session.
            </p>
          )}
          <div className="profile-wallet">
            <Wallet size={18} />
            <div>
              <strong>
                {connection.isConnected
                  ? `${connection.address?.slice(0, 6)}…${connection.address?.slice(-4)}`
                  : 'No wallet connected'}
              </strong>
              <p>
                {connection.isConnected
                  ? 'Ethereum browser wallet'
                  : 'A wallet is optional for practice.'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="full-width"
            onClick={() => setWalletOpen(true)}
          >
            {connection.isConnected ? 'Manage wallet' : 'Connect a wallet'}
            <ArrowRight size={15} />
          </Button>
          <div className="profile-private">
            <ShieldCheck size={18} />
            <p>
              Practice history stays in memory for this tab. Reloading clears
              your name and results.
            </p>
          </div>
        </aside>
        <div className="profile-content">
          <div className="profile-stats">
            <div>
              <span>ROUNDS PLAYED</span>
              <strong>{game.history.length.toString().padStart(2, '0')}</strong>
            </div>
            <div>
              <span>PERSONAL BEST</span>
              <strong>
                {game.history.length
                  ? `${Math.max(...game.history.map((round) => round.score))}/10`
                  : '—'}
              </strong>
            </div>
          </div>
          <div className="section-heading compact">
            <h2>Your round history</h2>
            <label>
              <span className="sr-only">Filter round history</span>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="all">All rounds</option>
                <option value="best">7+ correct</option>
              </select>
            </label>
          </div>
          <div className="panel">
            <RoundHistory rounds={rounds} />
          </div>
          {game.history.length > 0 && (
            <button
              className="text-link clear-history"
              onClick={() => setClearing(true)}
            >
              <Trash2 size={13} /> Clear practice history
            </button>
          )}
          <div className="profile-bottom">
            <span className="eyebrow">THE NEXT CHAPTER</span>
            <h3>There’s always more to know.</h3>
            <Link to="/categories" className="text-link">
              Find your next round <ArrowUpRightIcon />
            </Link>
          </div>
        </div>
      </div>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogTitle>What should we call you?</DialogTitle>
          <DialogDescription>
            A display name for this practice session. It isn’t shared or saved
            to your wallet.
          </DialogDescription>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim()) {
                game.setPlayerName(name.trim());
                setEditing(false);
                setSaved(true);
              }
            }}
          >
            <div className="form-field">
              <label htmlFor="display-name">Display name</label>
              <input
                id="display-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={24}
                required
                autoComplete="nickname"
              />
              <span className="field-help">Up to 24 characters.</span>
            </div>
            <Button
              type="submit"
              className="full-width"
              disabled={!name.trim()}
            >
              Save display name <Check size={16} />
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={clearing} onOpenChange={setClearing}>
        <DialogContent>
          <DialogTitle>Start with a clean page?</DialogTitle>
          <DialogDescription>
            This removes your practice history from the current tab. You can
            always play another round.
          </DialogDescription>
          <div className="dialog-actions">
            <Button variant="outline" onClick={() => setClearing(false)}>
              Keep my history
            </Button>
            <Button
              onClick={() => {
                game.clearHistory();
                setClearing(false);
              }}
            >
              Clear history
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <WalletDialog open={walletOpen} onOpenChange={setWalletOpen} />
    </div>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={15} />;
}
