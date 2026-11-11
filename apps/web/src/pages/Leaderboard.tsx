import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES } from '@cipherquiz/shared';
import { ArrowRight, ArrowUpRight, Info, Trophy } from 'lucide-react';
import { LEADERBOARD } from '../data/leaderboard';
import { PageHeading } from '../components/PageHeading';
import { Button } from '../components/ui/button';
import { CATEGORY_CLASS, CATEGORY_ICONS } from '../components/CategoryArt';
import { EmptyState } from '../components/EmptyState';

export function Leaderboard() {
  const [category, setCategory] = useState('All categories');
  const [period, setPeriod] = useState('all');
  const entries = LEADERBOARD.filter(
    (entry) =>
      (category === 'All categories' || entry.category === category) &&
      (period === 'all' || entry.week),
  );
  return (
    <div className="container app-page">
      <PageHeading
        eyebrow="IN GOOD COMPANY"
        title="A meeting of curious minds."
        action={
          <span className="badge">
            <Trophy size={13} /> Sample leaderboard
          </span>
        }
      >
        A glimpse of the future community. A little friendly competition.
      </PageHeading>
      <div className="notice leaderboard-notice">
        <Info />
        <div>
          <strong>Illustrative data, imaginary players</strong>
          <p>
            This leaderboard uses sample data. Practice rounds don’t publish
            scores or affect these rankings. Public score sharing needs a
            separate opt-in design.
          </p>
        </div>
      </div>
      <div className="leaderboard-toolbar">
        <div
          className="filter-tabs"
          role="group"
          aria-label="Leaderboard period"
        >
          <Button
            variant="ghost"
            aria-pressed={period === 'all'}
            onClick={() => setPeriod('all')}
          >
            All time
          </Button>
          <Button
            variant="ghost"
            aria-pressed={period === 'week'}
            onClick={() => setPeriod('week')}
          >
            This week
          </Button>
        </div>
        <label className="filter-select">
          <span className="sr-only">Filter by category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option>All categories</option>
            {CATEGORIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="panel leaderboard-panel">
        <div
          className="leaderboard-table"
          role="table"
          aria-label="Sample player rankings"
        >
          <div className="leaderboard-row table-heading" role="row">
            <span role="columnheader">RANK</span>
            <span role="columnheader">PLAYER</span>
            <span role="columnheader" className="leaderboard-category">
              FAVORITE CATEGORY
            </span>
            <span role="columnheader" className="leaderboard-rounds">
              ROUNDS
            </span>
            <span role="columnheader">ACCURACY</span>
          </div>
          {entries.map((entry, index) => {
            const Icon = CATEGORY_ICONS[entry.category];
            return (
              <div className="leaderboard-row" role="row" key={entry.name}>
                <span
                  role="cell"
                  className={`rank ${index === 0 ? 'first-rank' : ''}`}
                >
                  {index === 0 ? (
                    <Trophy size={18} aria-label="First place" />
                  ) : (
                    String(index + 1).padStart(2, '0')
                  )}
                </span>
                <div role="cell" className="player-cell">
                  <span className={`avatar ${CATEGORY_CLASS[entry.category]}`}>
                    {entry.initials}
                  </span>
                  <div>
                    <strong>{entry.name}</strong>
                    <span>Sample player</span>
                  </div>
                </div>
                <span role="cell" className="leaderboard-category">
                  <Icon size={14} />
                  {entry.category}
                </span>
                <span role="cell" className="leaderboard-rounds">
                  {entry.rounds}
                </span>
                <strong role="cell" className="accuracy">
                  {entry.score}%
                </strong>
              </div>
            );
          })}
        </div>
        {!entries.length && (
          <EmptyState title="No sample players in this view.">
            Try another category or time period.
          </EmptyState>
        )}
      </div>
      <div className="leaderboard-cta">
        <div>
          <h2>Find your own personal best.</h2>
          <p>Your next round is a fresh start.</p>
        </div>
        <Button asChild>
          <Link to="/categories">
            Play a practice round <ArrowRight />
          </Link>
        </Button>
      </div>
      <Link to="/how-it-works#confidentiality" className="text-link small">
        How we think about private scores <ArrowUpRight size={14} />
      </Link>
    </div>
  );
}
