import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { PracticeRound } from '../game/model';
import { CATEGORY_CLASS, CATEGORY_ICONS } from './CategoryArt';
import { EmptyState } from './EmptyState';
import { Button } from './ui/button';

export function RoundHistory({ rounds }: { rounds: PracticeRound[] }) {
  if (!rounds.length)
    return (
      <EmptyState
        title="Your first chapter is unwritten."
        action={
          <Button asChild variant="outline">
            <Link to="/categories">
              Find your first round <ArrowRight />
            </Link>
          </Button>
        }
      >
        Play a practice round and your results will appear here. History lasts
        for this tab’s current session.
      </EmptyState>
    );
  return (
    <div className="round-list">
      {rounds.map((round) => {
        const Icon = CATEGORY_ICONS[round.category];
        return (
          <Link
            className="round-row"
            key={round.id}
            to={`/results?id=${round.id}`}
          >
            <span className={`category-icon ${CATEGORY_CLASS[round.category]}`}>
              <Icon size={19} />
            </span>
            <div className="round-name">
              <strong>{round.category}</strong>
              <span>
                {new Date(round.completedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                · Practice
              </span>
            </div>
            <div className="round-score">
              <strong>
                {round.score}
                <span> / 10</span>
              </strong>
              <small>{round.totalReturn} credits return</small>
            </div>
            <ArrowUpRight size={17} />
          </Link>
        );
      })}
    </div>
  );
}
