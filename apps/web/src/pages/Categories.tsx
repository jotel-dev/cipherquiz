import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as RadioGroup from '@radix-ui/react-radio-group';
import { CATEGORIES, type Category } from '@cipherquiz/shared';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Coins,
  FlaskConical,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { useGame } from '../game/context';
import { CATEGORY_DETAILS } from '../data/questions';
import { TIERS } from '../game/model';
import { CategoryArt } from '../components/CategoryArt';
import { PageHeading } from '../components/PageHeading';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../components/ui/dialog';

export function Categories() {
  const [params] = useSearchParams();
  const initialCategory = params.get('category');
  const [selected, setSelected] = useState<Category | null>(
    CATEGORIES.find((category) => category === initialCategory) ?? null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [stake, setStake] = useState(10);
  const [seconds, setSeconds] = useState(30);
  const [accepted, setAccepted] = useState(false);
  const navigate = useNavigate();
  const game = useGame();
  function begin() {
    if (!selected || !accepted) return;
    game.start({ category: selected, stake, seconds });
    setConfirmOpen(false);
    navigate('/play');
  }
  return (
    <div className="container app-page">
      <Link className="back-link" to="/dashboard">
        <ArrowLeft size={15} /> Back to playroom
      </Link>
      <PageHeading
        eyebrow="01 / CHOOSE YOUR CATEGORY"
        title="Follow your curiosity."
      >
        Go with what you know. Or enjoy discovering what you don’t.
      </PageHeading>
      <RadioGroup.Root
        className="selection-grid"
        aria-label="Quiz category"
        value={selected ?? ''}
        onValueChange={(value) => setSelected(value as Category)}
      >
        {CATEGORIES.map((category, index) => (
          <RadioGroup.Item
            className="selection-card"
            value={category}
            key={category}
          >
            <CategoryArt category={category} />
            <div className="selection-card-body">
              <div className="selection-top">
                <span className="eyebrow">
                  0{index + 1} / {CATEGORY_DETAILS[category].label}
                </span>
                <span className="selection-check">
                  <RadioGroup.Indicator>
                    <Check size={15} />
                  </RadioGroup.Indicator>
                </span>
              </div>
              <h2>{category}</h2>
              <p>{CATEGORY_DETAILS[category].description}</p>
              <span className="small muted">
                <Clock3 size={14} /> 10 questions · Choose your pace
              </span>
            </div>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
      <div className="selection-bottom">
        <div>
          <ShieldCheck size={20} />
          <span>
            <strong>{selected ?? 'Something for every kind of mind.'}</strong>
            <small>
              {selected
                ? 'Your category is selected. Make it a good round.'
                : 'Choose a category to get started.'}
            </small>
          </span>
        </div>
        <Button
          size="large"
          disabled={!selected}
          onClick={() => {
            setAccepted(false);
            setConfirmOpen(true);
          }}
        >
          Set up your round <ArrowRight />
        </Button>
      </div>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="stake-dialog">
          <p className="eyebrow">02 / A LITTLE PREPARATION</p>
          <DialogTitle>Make the round yours.</DialogTitle>
          <DialogDescription>
            {selected} · 10 questions · Practice mode
          </DialogDescription>
          <div className="notice">
            <FlaskConical />
            <div>
              <strong>Practice credits, zero real funds</strong>
              <p>
                This stake is a simulation. No tokens move, no transaction is
                sent, and your wallet won’t be asked to sign.
              </p>
            </div>
          </div>
          <fieldset className="form-field">
            <legend>
              Choose a practice stake <span>credits</span>
            </legend>
            <RadioGroup.Root
              className="segmented-control"
              value={String(stake)}
              onValueChange={(value) => setStake(Number(value))}
              aria-label="Practice stake"
            >
              {[10, 25, 50].map((amount) => (
                <RadioGroup.Item value={String(amount)} key={amount}>
                  <Coins size={15} />
                  {amount}
                </RadioGroup.Item>
              ))}
            </RadioGroup.Root>
          </fieldset>
          <div className="form-field">
            <label htmlFor="round-pace">Your pace</label>
            <select
              id="round-pace"
              value={seconds}
              onChange={(event) => setSeconds(Number(event.target.value))}
            >
              <option value="30">Classic · 30 seconds per question</option>
              <option value="60">Take your time · 60 seconds</option>
              <option value="0">No timer · Play at your own pace</option>
            </select>
            <p className="field-help">
              Timed-out and skipped questions count as incorrect.
            </p>
          </div>
          <div className="stake-summary">
            <span>Possible total returns</span>
            <div>
              {TIERS.map((tier) => (
                <div key={tier.score}>
                  <span>{tier.score}</span>
                  <strong>
                    {stake * tier.multiplier}
                    <small> cr</small>
                  </strong>
                </div>
              ))}
            </div>
            <p>Includes the practice stake. Credits have no monetary value.</p>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
            />
            <span>
              I understand this is a practice round with no real encryption,
              stake or payout.
            </span>
          </label>
          <Button className="full-width" disabled={!accepted} onClick={begin}>
            Start practice round <ArrowRight />
          </Button>
          <div className="dialog-footnote">
            <Info size={15} />
            <p>Practice history clears when you reload this page.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
