import { Link } from 'react-router-dom';
import { CATEGORIES } from '@cipherquiz/shared';
import {
  ArrowRight,
  ArrowUpRight,
  CircleHelp,
  LockKeyhole,
  Target,
  Trophy,
} from 'lucide-react';
import { useGame } from '../game/context';
import { Button } from '../components/ui/button';
import { Reveal } from '../components/ui/reveal';
import { PageHeading } from '../components/PageHeading';
import { RoundHistory } from '../components/RoundHistory';
import { CategoryArt } from '../components/CategoryArt';

export function Dashboard() {
  const { history, playerName } = useGame();
  const best = history.length
    ? Math.max(...history.map((round) => round.score))
    : null;
  const average = history.length
    ? Math.round(
        (history.reduce((sum, round) => sum + round.score, 0) /
          history.length) *
          10,
      )
    : null;
  return (
    <div className="container app-page">
      <PageHeading
        eyebrow="YOUR PLAYROOM"
        title={`Stay curious, ${playerName.toLowerCase()}.`}
      >
        A fresh question. A new perspective. Your next round is waiting.
      </PageHeading>
      <Reveal>
        <section className="dashboard-feature">
          <div>
            <span className="badge">
              <CircleHelp size={13} /> THE DAILY DOSE OF CURIOSITY
            </span>
            <h2>
              You know more
              <br />
              than you <span className="serif-word">think.</span>
            </h2>
            <p>
              Ten questions to find out. Choose a category,
              <br className="desktop-only" /> set your pace, and give your mind
              a little play.
            </p>
            <Button asChild>
              <Link to="/categories">
                Start a practice round <ArrowRight />
              </Link>
            </Button>
            <span className="feature-note">
              Free to try · No wallet required
            </span>
          </div>
          <div className="feature-graphic" aria-hidden="true">
            <span className="feature-orbit" />
            <span className="feature-ten">
              10
              <span>
                QUESTIONS.
                <br />
                ENDLESS POSSIBILITY.
              </span>
            </span>
            <span className="feature-ticket">
              <LockKeyhole size={16} /> A little mystery is a good thing.
            </span>
          </div>
        </section>
      </Reveal>
      <div className="stat-grid">
        {[
          {
            icon: CircleHelp,
            value: history.length.toString().padStart(2, '0'),
            label: 'Rounds played',
          },
          {
            icon: Trophy,
            value: best === null ? '—' : `${best}/10`,
            label: 'Personal best',
          },
          {
            icon: Target,
            value: average === null ? '—' : `${average}%`,
            label: 'Average accuracy',
          },
        ].map(({ icon: Icon, value, label }, index) => (
          <Reveal key={label} delay={index * 50}>
            <div className="stat">
              <Icon size={18} />
              <strong>{value}</strong>
              <span>{label}</span>
              <small>This practice session</small>
            </div>
          </Reveal>
        ))}
      </div>
      <section className="app-section">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">PICK A DIRECTION</p>
            <h2>Where will your mind wander?</h2>
          </div>
          <Link className="text-link" to="/categories">
            All categories <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="category-grid dashboard-categories">
          {CATEGORIES.map((category) => (
            <Link
              key={category}
              className="category-card"
              to={`/categories?category=${encodeURIComponent(category)}`}
            >
              <CategoryArt category={category} />
              <div className="category-card-body">
                <h3>
                  {category}
                  <ArrowUpRight size={17} />
                </h3>
                <p>10 questions · Practice</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="app-section">
        <div className="section-heading compact">
          <h2>Your recent rounds</h2>
          <Link className="text-link" to="/profile">
            View history <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="panel">
          <RoundHistory rounds={history.slice(0, 3)} />
        </div>
      </section>
    </div>
  );
}
