import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CircleHelp,
  Clock3,
  Eye,
  FlaskConical,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Reveal } from '../components/ui/reveal';
import { PageHeading } from '../components/PageHeading';
import { TIERS } from '../game/model';

export function HowItWorks() {
  return (
    <div className="container app-page guide-page">
      <PageHeading
        eyebrow="HOW IT WORKS"
        title="A good game. A clear way to play."
      >
        Choose a subject, follow your curiosity, and find out what you know.
        Your first round is free to try.
      </PageHeading>
      <div className="guide-steps">
        {[
          {
            icon: CircleHelp,
            title: 'Find your playing field.',
            copy: 'Choose Mathematics, Geography, History or General Knowledge. Pick a practice stake and a pace that suits you.',
          },
          {
            icon: Clock3,
            title: 'Give it your best ten.',
            copy: 'Answer ten questions. Choose a 30-second or 60-second timer, or play without one. Skipped and timed-out questions count as incorrect.',
          },
          {
            icon: Eye,
            title: 'See what you know.',
            copy: 'Reveal your practice score, review the answers, and build your own history. Every round is another chance to learn.',
          },
        ].map(({ icon: Icon, title, copy }, index) => (
          <Reveal key={title} delay={index * 50}>
            <article className="guide-step">
              <div>
                <span>0{index + 1}</span>
                <Icon strokeWidth={1.5} />
              </div>
              <h2>{title}</h2>
              <p>{copy}</p>
            </article>
          </Reveal>
        ))}
      </div>
      <section
        className="guide-privacy"
        id="confidentiality"
        aria-labelledby="confidentiality-title"
      >
        <Reveal>
          <p className="eyebrow">DESIGNED AROUND PRIVACY</p>
          <h2 id="confidentiality-title">
            Your knowledge.
            <br />
            <span className="heading-accent">Your business.</span>
          </h2>
          <p>
            CipherQuiz is being built with Zama fully homomorphic encryption
            (FHE), so future onchain rounds can compute scores from encrypted
            answers.
          </p>
        </Reveal>
        <div className="guide-privacy-details">
          <div>
            <LockKeyhole />
            <span>
              <strong>Private by intention</strong>
              <p>
                Encrypted answers and player-authorized score decryption are the
                intended onchain experience.
              </p>
            </span>
          </div>
          <div>
            <ShieldCheck />
            <span>
              <strong>Transparent about the boundaries</strong>
              <p>
                Wallet addresses, participation and transaction timing remain
                public. Encryption does not make activity anonymous.
              </p>
            </span>
          </div>
          <div className="notice">
            <FlaskConical />
            <div>
              <strong>You’re trying local practice</strong>
              <p>
                Practice answers are processed in this browser without
                encryption. Live scoring, staking and payouts are not connected.
                Connecting a wallet does not change practice mode.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section
        className="guide-returns"
        aria-labelledby="practice-return-title"
      >
        <div>
          <p className="eyebrow">UNDERSTAND THE PRACTICE STAKE</p>
          <h2 id="practice-return-title">
            A transparent score.
            <br />
            An illustrative return.
          </h2>
          <p>
            Practice credits have no monetary value. These proposed tiers show
            total returns, including the original practice stake. No tokens move
            and no payout is sent.
          </p>
        </div>
        <div className="guide-tier-list">
          {TIERS.map((tier) => (
            <div key={tier.score}>
              <span>{tier.score} correct</span>
              <strong>
                {tier.multiplier.toFixed(1)}×<small> total return</small>
              </strong>
            </div>
          ))}
        </div>
      </section>
      <div className="guide-bottom">
        <p>
          One curious mind is all you need.
          <span>No wallet required for practice.</span>
        </p>
        <Button asChild>
          <Link to="/dashboard">
            Enter the playroom <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
