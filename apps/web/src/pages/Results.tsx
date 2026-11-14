import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Eye,
  FlaskConical,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { useGame } from '../game/context';
import { getMultiplier } from '../game/model';
import { QUESTIONS } from '../data/questions';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/EmptyState';
import { PageHeading } from '../components/PageHeading';

export function Results() {
  const { history } = useGame();
  const [params] = useSearchParams();
  const round = params.get('id')
    ? history.find((item) => item.id === params.get('id'))
    : history[0];
  const [revealed, setRevealed] = useState(false);
  const [revealing, setRevealing] = useState(false);
  useEffect(() => {
    if (!revealing) return;
    const timer = setTimeout(() => {
      setRevealed(true);
      setRevealing(false);
    }, 650);
    return () => clearTimeout(timer);
  }, [revealing]);
  if (!round)
    return (
      <div className="container app-page">
        <PageHeading
          eyebrow="YOUR RESULTS"
          title="A good round leaves a story."
        />
        <div className="panel">
          <EmptyState
            title="No result here just yet."
            action={
              <Button asChild>
                <Link to="/categories">
                  Play a practice round <ArrowRight />
                </Link>
              </Button>
            }
          >
            Complete a round to see your score. Practice results are kept only
            in this tab’s current session.
          </EmptyState>
        </div>
      </div>
    );
  const multiplier = getMultiplier(round.score);
  return (
    <div className="container app-page results-page">
      <PageHeading
        eyebrow="THE MOMENT OF KNOWING"
        title={
          revealed
            ? round.score >= 7
              ? 'That was well played.'
              : 'Curiosity always wins.'
            : 'A little mystery. All yours.'
        }
      >
        {round.category} · Practice round complete
      </PageHeading>
      <div className="result-layout">
        <section className="result-card">
          <div className="result-card-heading">
            <span className="badge">
              <FlaskConical size={13} /> Practice result
            </span>
            <span className="small muted">10 questions</span>
          </div>
          {!revealed ? (
            <div className="sealed-result">
              <div className="result-lock">
                <LockKeyhole strokeWidth={1.2} />
              </div>
              <h2>Your score is ready.</h2>
              <p>Take a breath. Then see how you did.</p>
              <Button onClick={() => setRevealing(true)} disabled={revealing}>
                {revealing ? (
                  <>
                    <span className="loader" /> Revealing practice result…
                  </>
                ) : (
                  <>
                    <Eye size={17} /> Reveal practice result
                  </>
                )}
              </Button>
              <small>
                No signature required. This reveal is simulated;
                <br />
                the result is not encrypted.
              </small>
            </div>
          ) : (
            <div className="revealed-result" role="status">
              <span className="eyebrow">YOUR PRACTICE SCORE</span>
              <div className="result-score">
                {round.score}
                <span>/ 10</span>
              </div>
              <h2>
                {round.score === 10
                  ? 'A perfect little moment.'
                  : round.score >= 7
                    ? 'You brought your A-game.'
                    : 'A little wiser than before.'}
              </h2>
              <p>
                {round.score >= 7
                  ? 'Good instincts. Great knowledge. Keep that curiosity going.'
                  : 'Every question is a chance to learn something new.'}
              </p>
              <div className="result-mini-stats">
                <div>
                  <strong>{round.score * 10}%</strong>
                  <span>Accuracy</span>
                </div>
                <div>
                  <strong>{multiplier.toFixed(1)}×</strong>
                  <span>Practice return tier</span>
                </div>
              </div>
            </div>
          )}
          <div className="result-local-note">
            <ShieldCheck size={15} /> Calculated locally · no onchain proof
          </div>
        </section>
        <aside className="panel payout-status">
          <p className="eyebrow">YOUR PRACTICE RETURN</p>
          <h2>Everything accounted for.</h2>
          <dl>
            <div>
              <dt>Practice stake</dt>
              <dd>{round.stake} credits</dd>
            </div>
            <div>
              <dt>Return tier</dt>
              <dd>
                {revealed ? `${multiplier.toFixed(1)}×` : 'Reveal to see'}
              </dd>
            </div>
            <div className="total-row">
              <dt>Total return</dt>
              <dd>
                {revealed ? round.totalReturn : '—'}
                <small> credits</small>
              </dd>
            </div>
          </dl>
          <div className="notice">
            <FlaskConical />
            <div>
              <strong>Simulation complete</strong>
              <p>
                Practice credits have no monetary value. No payout or blockchain
                transaction occurred. Total return includes the stake.
              </p>
            </div>
          </div>
          <div className="status-checklist">
            <span>
              <Check /> Ten questions completed
            </span>
            <span>
              <Check /> Practice score calculated
            </span>
            <span className="muted">
              <LockKeyhole /> Onchain settlement not integrated
            </span>
          </div>
          <Button asChild className="full-width">
            <Link
              to={`/categories?category=${encodeURIComponent(round.category)}`}
            >
              <RotateCcw size={16} /> Play another round
            </Link>
          </Button>
          <Button asChild variant="ghost" className="full-width">
            <Link to="/profile">
              Your round history <ArrowUpRight size={15} />
            </Link>
          </Button>
        </aside>
      </div>
      {revealed && (
        <details className="answer-review">
          <summary>
            Learn something for next time <ChevronDown size={18} />
          </summary>
          <p className="muted small">
            Practice answer keys are public fixtures. Real encrypted rounds must
            never ship answer keys in the browser.
          </p>
          {QUESTIONS[round.category].map((question, index) => (
            <div className="review-row" key={question.id}>
              <span
                className={`review-index ${round.answers[index] === question.answer ? 'correct' : ''}`}
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h3>{question.prompt}</h3>
                <p>
                  Your answer:{' '}
                  {round.answers[index] === null
                    ? 'Skipped / timed out'
                    : question.choices[round.answers[index]!]}
                </p>
                <p className="correct-answer">
                  Correct answer: {question.choices[question.answer]}
                </p>
              </div>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
