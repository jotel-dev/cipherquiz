import { Link } from 'react-router-dom';
import { CATEGORIES } from '@cipherquiz/shared';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleHelp,
  Clock3,
  Fingerprint,
  FlaskConical,
  Globe2,
  Layers3,
  LockKeyhole,
  MoveUpRight,
  Play,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Reveal } from '../components/ui/reveal';
import { CategoryArt } from '../components/CategoryArt';
import { CATEGORY_DETAILS } from '../data/questions';
import { TIERS } from '../game/model';

function HeroArtwork() {
  return (
    <figure
      className="hero-artwork"
      aria-label="Concept illustration placeholder: a quiz card surrounded by private answer and score slips. Approved artwork to follow."
    >
      <div className="artwork-top">
        <span>THE ART OF KNOWING</span>
        <span>FIG. 001</span>
      </div>
      <div className="orbital orbital-one" />
      <div className="orbital orbital-two" />
      <div className="art-spark spark-one" aria-hidden="true">
        <Sparkles strokeWidth={1.2} />
      </div>
      <div className="sealed-slip">
        <LockKeyhole size={15} />
        <span>YOUR ANSWER</span>
        <div className="cipher-dots">•••• ••••</div>
        <span className="slip-line" />
      </div>
      <div className="hero-question-card">
        <div className="question-card-top">
          <span className="badge">
            <Globe2 size={12} /> GEOGRAPHY
          </span>
          <span>01 / 10</span>
        </div>
        <span className="hero-card-index">
          A world of
          <br />
          good questions.
        </span>
        <p>
          Which country is home to
          <br />
          the ancient city of Petra?
        </p>
        <div className="hero-answer">
          <span>A</span> Egypt
        </div>
        <div className="hero-answer chosen">
          <span>B</span> Jordan <Check size={15} />
        </div>
        <div className="card-bottom">
          <LockKeyhole size={12} /> Your knowledge. Your business.
        </div>
      </div>
      <div className="score-slip">
        <span className="mini-lock">
          <ShieldCheck size={17} />
        </span>
        <div>
          <span>YOUR SCORE</span>
          <strong>For your eyes only.</strong>
        </div>
        <span className="score-asterisks">
          <Sparkles strokeWidth={1.4} />
        </span>
      </div>
      <div className="artwork-bottom">
        <span>
          <span className="tiny-square" /> CONCEPT STUDY
        </span>
        <span>APPROVED ILLUSTRATION TO FOLLOW</span>
      </div>
    </figure>
  );
}

export function Landing() {
  return (
    <>
      <section className="hero container">
        <Reveal className="hero-copy">
          <div className="eyebrow hero-eyebrow">
            <span className="eyebrow-line" /> A LITTLE MYSTERY. A LOT OF
            KNOWLEDGE.
          </div>
          <h1>
            Great minds.
            <br />
            Private <span className="serif-word">answers.</span>
          </h1>
          <p className="hero-description">
            The trivia is for everyone.
            <br />
            Your answers are just for you.
          </p>
          <p className="hero-support">
            Meet CipherQuiz. Ten questions, a curious mind, and a new way to
            play with confidentiality at its core.
          </p>
          <div className="hero-actions">
            <Button asChild size="large">
              <Link to="/dashboard">
                Play now <ArrowUpRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="large">
              <Link to="/#how-it-works">
                <span className="play-circle">
                  <Play size={11} fill="currentColor" />
                </span>{' '}
                How it works
              </Link>
            </Button>
          </div>
          <div className="hero-practice">
            <FlaskConical size={14} />
            <span>Try a practice round. No wallet needed.</span>
          </div>
        </Reveal>
        <Reveal delay={100} className="hero-visual">
          <HeroArtwork />
        </Reveal>
      </section>
      <div className="principles-bar container">
        <span>
          <Layers3 /> 10 questions. One great round.
        </span>
        <span>
          <LockKeyhole /> Confidential by design.
        </span>
        <span>
          <ShieldCheck /> Your knowledge stays yours.
        </span>
        <Link to="/#privacy">
          A smarter way to play <ArrowDown size={14} />
        </Link>
      </div>
      <section className="section container" id="categories">
        <Reveal>
          <div className="section-heading">
            <div>
              <p className="eyebrow">FOLLOW YOUR CURIOSITY</p>
              <h2>
                What’s your <span className="serif-word">strong suit?</span>
              </h2>
            </div>
            <Link className="text-link" to="/categories">
              Explore categories <ArrowUpRight size={16} />
            </Link>
          </div>
        </Reveal>
        <div className="category-grid">
          {CATEGORIES.map((category, index) => (
            <Reveal delay={index * 55} key={category}>
              <Link
                className="category-card"
                to={`/categories?category=${encodeURIComponent(category)}`}
              >
                <CategoryArt category={category} />
                <div className="category-card-body">
                  <span className="category-number">0{index + 1} /</span>
                  <h3>
                    {category}
                    <ArrowUpRight size={18} />
                  </h3>
                  <p>{CATEGORY_DETAILS[category].short}</p>
                  <div className="category-card-meta">
                    <span>10 questions</span>
                    <span>Practice round</span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="how-section section" id="how-it-works">
        <div className="container">
          <Reveal>
            <div className="section-heading">
              <div>
                <p className="eyebrow">LESS FRICTION. MORE PLAY.</p>
                <h2>
                  A good game.
                  <br />
                  In three simple moves.
                </h2>
              </div>
              <p className="section-aside">
                A few minutes to test what you know.
                <br />
                Something new to take away.
              </p>
            </div>
          </Reveal>
          <div className="steps-grid">
            {[
              {
                icon: CircleHelp,
                title: 'Pick your playing field.',
                copy: 'Go with your specialty, or try something unexpected. Four categories. Plenty to be curious about.',
              },
              {
                icon: Clock3,
                title: 'Trust your knowledge.',
                copy: 'Take on ten questions at your own pace, or race the clock. Lock in an answer and keep moving.',
              },
              {
                icon: Fingerprint,
                title: 'Make it your moment.',
                copy: 'Reveal your practice score and see how you did. Come back with a little more knowledge next time.',
              },
            ].map(({ icon: Icon, title, copy }, index) => (
              <Reveal delay={index * 65} key={title}>
                <article className="step">
                  <div className="step-top">
                    <span>0{index + 1}</span>
                    <Icon strokeWidth={1.4} />
                  </div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </article>
              </Reveal>
            ))}
          </div>
          <div className="how-bottom">
            <span className="badge">
              <FlaskConical size={13} /> You’re trying the practice experience
            </span>
            <span>
              Onchain gameplay and confidential rewards are coming later.
            </span>
          </div>
        </div>
      </section>
      <section className="privacy-section section container" id="privacy">
        <Reveal className="privacy-visual">
          <div className="privacy-art">
            <div className="privacy-ring ring-one" />
            <div className="privacy-ring ring-two" />
            <div className="privacy-ring ring-three" />
            <div className="privacy-center">
              <Fingerprint strokeWidth={1} />
            </div>
            <span className="privacy-label label-one">
              <LockKeyhole size={13} /> ANSWERS
            </span>
            <span className="privacy-label label-two">
              <LockKeyhole size={13} /> SCORE
            </span>
            <span className="privacy-coordinate">
              PRIVATE BY INTENTION. / CQ—01
            </span>
          </div>
        </Reveal>
        <Reveal delay={80} className="privacy-copy">
          <p className="eyebrow">KNOWLEDGE IS PERSONAL</p>
          <h2>
            Keep a little
            <br />
            to <span className="serif-word">yourself.</span>
          </h2>
          <p>
            The future of trivia should let you play without putting every
            answer on display.
          </p>
          <p>
            CipherQuiz is being built with Zama fully homomorphic encryption
            (FHE), so future onchain rounds can compute scores from encrypted
            answers.
          </p>
          <div className="privacy-facts">
            <div>
              <LockKeyhole />
              <span>Designed for encrypted answers and private scores.</span>
            </div>
            <div>
              <ShieldCheck />
              <span>Wallet addresses and onchain activity remain public.</span>
            </div>
          </div>
          <div className="privacy-caveat">
            <strong>A transparent note on this preview</strong>
            <p>
              Practice answers are processed locally in your browser and are not
              encrypted. Live FHE scoring, staking and settlement are not
              integrated here.
            </p>
          </div>
        </Reveal>
      </section>
      <section className="tiers-section section">
        <div className="container tiers-layout">
          <Reveal>
            <p className="eyebrow">LET YOUR KNOWLEDGE ADD UP</p>
            <h2>
              Good answers.
              <br />
              Better <span className="serif-word">possibilities.</span>
            </h2>
            <p className="tiers-description">
              A clear score. A clear reward structure.
              <br />
              Here’s how the proposed return tiers work.
            </p>
            <span className="badge">
              Proposed tiers · simulated in practice
            </span>
          </Reveal>
          <Reveal delay={80}>
            <div className="payout-table">
              <div className="payout-head">
                <span>CORRECT ANSWERS</span>
                <span>TOTAL RETURN</span>
              </div>
              {TIERS.map((tier, index) => (
                <div
                  className={`payout-row ${index === 0 ? 'payout-best' : ''}`}
                  key={tier.score}
                >
                  <div>
                    <strong>{tier.score}</strong>
                    <span>{tier.label}</span>
                  </div>
                  <strong className="payout-multiplier">
                    {tier.multiplier.toFixed(1)}
                    <span>×</span>
                    {index === 0 && <MoveUpRight size={18} />}
                  </strong>
                </div>
              ))}
              <p className="payout-note">
                Total return includes the original stake. Below 7 correct: no
                return. Practice credits have no monetary value.
              </p>
            </div>
          </Reveal>
        </div>
      </section>
      <section className="closing-section container">
        <Reveal>
          <span className="eyebrow">YOUR NEXT “I KNEW THAT” STARTS HERE</span>
          <h2>
            Bring your <span className="serif-word">curiosity.</span>
            <br />
            We’ll bring the questions.
          </h2>
          <Button asChild size="large">
            <Link to="/dashboard">
              Let’s play <ArrowRight />
            </Link>
          </Button>
          <p>No wallet. No real stakes. Just a good first round.</p>
        </Reveal>
        <span className="closing-number" aria-hidden="true">
          10<span>GOOD QUESTIONS</span>
        </span>
      </section>
    </>
  );
}
