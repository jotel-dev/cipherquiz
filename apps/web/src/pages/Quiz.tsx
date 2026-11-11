import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import * as RadioGroup from '@radix-ui/react-radio-group';
import { ArrowRight, Check, Clock3, Flag, LockKeyhole, X } from 'lucide-react';
import { useGame } from '../game/context';
import { QUESTIONS } from '../data/questions';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../components/ui/dialog';

export function Quiz() {
  const game = useGame();
  const navigate = useNavigate();
  const config = game.config;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(config?.seconds ?? 0);
  const [leaving, setLeaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const deadline = useRef(Date.now() + (config?.seconds ?? 0) * 1000);
  const committed = useRef(false);
  const completionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advance = useCallback(
    (answer: number | null) => {
      if (!config || committed.current) return;
      committed.current = true;
      const next = [...answers, answer];
      if (answer === null)
        setAnnouncement(`Question ${index + 1} skipped or timed out.`);
      else
        setAnnouncement(
          `Answer ${index + 1} recorded for this practice round.`,
        );
      if (index === 9) {
        setProcessing(true);
        completionTimer.current = setTimeout(() => {
          game.finish(next);
          navigate('/results', { replace: true });
        }, 850);
      } else {
        setAnswers(next);
        setSelected(null);
        setIndex(index + 1);
        deadline.current = Date.now() + config.seconds * 1000;
        setRemaining(config.seconds);
      }
    },
    [config, answers, index, game, navigate],
  );
  useEffect(() => {
    committed.current = false;
    heading.current?.focus();
  }, [index]);
  useEffect(() => {
    if (!config?.seconds || processing) return;
    const tick = () => {
      const left = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000),
      );
      setRemaining(left);
      if (left === 0) advance(null);
    };
    const timer = setInterval(tick, 200);
    return () => clearInterval(timer);
  }, [config, index, advance, processing]);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', guard);
    return () => {
      window.removeEventListener('beforeunload', guard);
      if (completionTimer.current) clearTimeout(completionTimer.current);
    };
  }, []);
  if (processing)
    return (
      <div className="container processing-screen" role="status">
        <span className="loader loader-large" />
        <p className="eyebrow">PRACTICE ROUND COMPLETE</p>
        <h1>A moment for your result.</h1>
        <p>
          Calculating your score locally. No blockchain transaction is being
          sent.
        </p>
      </div>
    );
  if (!config) return <Navigate to="/categories" replace />;
  const question = QUESTIONS[config.category][index]!;
  return (
    <div className="quiz-page container">
      <div className="quiz-hud">
        <div className="quiz-top">
          <Link
            to="/"
            onClick={(event) => {
              event.preventDefault();
              setLeaving(true);
            }}
            className="back-link"
          >
            <X size={15} /> Leave round
          </Link>
          <span className="badge">{config.category}</span>
          <span
            className={`quiz-timer ${remaining <= 10 && config.seconds > 0 ? 'timer-warning' : ''}`}
            role="timer"
            aria-label={
              config.seconds
                ? `${remaining} seconds remaining`
                : 'No time limit'
            }
          >
            <Clock3 size={17} />
            {config.seconds
              ? `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`
              : 'At your pace'}
          </span>
        </div>
        <div className="quiz-progress-heading">
          <span>
            QUESTION {String(index + 1).padStart(2, '0')}{' '}
            <span className="muted">/ 10</span>
          </span>
          <span>{index * 10}% complete</span>
        </div>
        <Progress value={index * 10} label="Round progress" />
      </div>
      <div className="quiz-question" key={question.id}>
        <p className="eyebrow">TRUST YOUR CURIOSITY.</p>
        <h1 tabIndex={-1} ref={heading}>
          {question.prompt}
        </h1>
        <p className="muted">
          One question. Four possibilities. Make your choice.
        </p>
        <RadioGroup.Root
          key={question.id}
          className="answer-options"
          aria-label="Your answer"
          value={selected === null ? '' : String(selected)}
          onValueChange={(value) => setSelected(Number(value))}
        >
          {question.choices.map((choice, choiceIndex) => (
            <RadioGroup.Item
              key={choice}
              value={String(choiceIndex)}
              className="answer-option"
            >
              <span className="answer-letter">{'ABCD'[choiceIndex]}</span>
              <span>{choice}</span>
              <span className="answer-check">
                <RadioGroup.Indicator>
                  <Check size={18} />
                </RadioGroup.Indicator>
              </span>
            </RadioGroup.Item>
          ))}
        </RadioGroup.Root>
      </div>
      <div className="quiz-controls">
        <Button variant="ghost" onClick={() => advance(null)}>
          Skip question
        </Button>
        <Button onClick={() => advance(selected)} disabled={selected === null}>
          {index === 9 ? 'Finish round' : 'Lock in answer'}
          {index === 9 ? <Flag size={17} /> : <ArrowRight />}
        </Button>
      </div>
      <div className="quiz-footnote">
        <LockKeyhole size={14} />
        <span>
          Practice only. Answers are processed in this browser, without
          encryption.
        </span>
      </div>
      <div className="sr-only" aria-live="polite">
        {announcement}
        {remaining === 10 ? ' Ten seconds remaining.' : ''}
      </div>
      <Dialog open={leaving} onOpenChange={setLeaving}>
        <DialogContent>
          <p className="eyebrow">TAKING A BREAK?</p>
          <DialogTitle>Leave this round?</DialogTitle>
          <DialogDescription>
            Your progress in this round will be lost. No practice credits or
            real funds are at risk.
          </DialogDescription>
          <div className="dialog-actions">
            <Button variant="outline" onClick={() => setLeaving(false)}>
              Keep playing
            </Button>
            <Button
              onClick={() => {
                game.abandon();
                navigate('/dashboard', { replace: true });
              }}
            >
              Leave round
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
