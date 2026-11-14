import { useState } from 'react';
import {
  ArrowRight,
  Check,
  CircleHelp,
  FlaskConical,
  Globe2,
  LockKeyhole,
  RotateCcw,
} from 'lucide-react';
import * as RadioGroup from '@radix-ui/react-radio-group';
import { QUESTIONS } from '../data/questions';
import { Button } from './ui/button';

const SAMPLES = [
  QUESTIONS.Geography[0]!,
  QUESTIONS['General Knowledge'][3]!,
  QUESTIONS.Mathematics[0]!,
];

// An interactive illustration using public practice questions. No wallet, score,
// credit balance, or round history is touched by this self-contained preview.
export function TriviaPreview() {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const question = SAMPLES[index]!;
  const correct = answer === question.answer;
  function next() {
    setIndex((current) => (current + 1) % SAMPLES.length);
    setAnswer(null);
  }
  return (
    <div
      className="trivia-illustration"
      aria-label="Interactive trivia illustration"
    >
      <div className="preview-back-card" aria-hidden="true">
        <CircleHelp strokeWidth={1} />
      </div>
      <div className="preview-annotation" aria-hidden="true">
        <LockKeyhole size={14} />
        <span>
          A little mystery.
          <br />A lot of possibility.
        </span>
      </div>
      <section className="preview-card" aria-labelledby="preview-title">
        <div className="preview-card-top">
          <span className="preview-label">
            <Globe2 size={14} /> A little warm-up
          </span>
          <span className="preview-dot" aria-hidden="true" />
        </div>
        <div className="preview-progress" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <p className="preview-kicker">Try a question</p>
        <h2 id="preview-title">{question.prompt}</h2>
        <RadioGroup.Root
          key={question.id}
          className="preview-options"
          value={answer === null ? '' : String(answer)}
          onValueChange={(value) => setAnswer(Number(value))}
          aria-label="Sample trivia answer"
        >
          {question.choices.map((choice, choiceIndex) => (
            <RadioGroup.Item
              key={`${question.id}-${choice}`}
              value={String(choiceIndex)}
              className="preview-option"
            >
              <span className="preview-option-letter">
                {'ABCD'[choiceIndex]}
              </span>
              <span>{choice}</span>
              <RadioGroup.Indicator className="preview-option-check">
                <Check size={14} />
              </RadioGroup.Indicator>
            </RadioGroup.Item>
          ))}
        </RadioGroup.Root>
        <div className="preview-feedback" aria-live="polite" aria-atomic="true">
          {answer === null ? (
            <p>Go on. Trust your first instinct.</p>
          ) : (
            <p className={correct ? 'preview-correct' : ''}>
              {correct ? 'You knew it.' : 'A little wiser already.'}{' '}
              <span>{question.choices[question.answer]} is correct.</span>
            </p>
          )}
        </div>
        <div className="preview-card-bottom">
          <span>
            <FlaskConical size={13} /> Local practice preview
          </span>
          <Button
            variant="ghost"
            size="small"
            onClick={next}
            aria-label="Try another sample question"
          >
            {answer === null ? (
              <RotateCcw size={14} />
            ) : (
              <ArrowRight size={14} />
            )}
            <span>Next question</span>
          </Button>
        </div>
      </section>
      <p className="preview-caption">Your first “I knew that” starts here.</p>
    </div>
  );
}
