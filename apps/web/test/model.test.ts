import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES } from '@cipherquiz/shared';
import { QUESTIONS } from '../src/data/questions';
import { completeRound, getMultiplier, scoreAnswers } from '../src/game/model';

describe('practice scoring and proposed returns', () => {
  it('uses the contract proposal’s tier boundaries and total returns including stake', () => {
    assert.deepEqual(
      [0, 6, 7, 8, 9, 10].map(getMultiplier),
      [0, 0, 1.2, 1.5, 1.5, 2],
    );
    const answers = QUESTIONS.Geography.map((question) => question.answer);
    const round = completeRound(
      { category: 'Geography', stake: 25, seconds: 30 },
      answers,
    );
    assert.equal(round.score, 10);
    assert.equal(round.totalReturn, 50);
    answers[0] = 3;
    assert.equal(
      round.answers[0],
      1,
      'completed answers must be immutable snapshots',
    );
  });
  it('treats skips and timeouts as incorrect', () => {
    assert.equal(scoreAnswers('Mathematics', Array(10).fill(null)), 0);
    const answers = QUESTIONS.Mathematics.map((question, index) =>
      index < 7 ? question.answer : null,
    );
    const round = completeRound(
      { category: 'Mathematics', stake: 10, seconds: 0 },
      answers,
    );
    assert.equal(round.score, 7);
    assert.equal(round.totalReturn, 12);
  });
  it('rejects incomplete rounds, invalid option indexes and unsupported stakes', () => {
    const config = { category: 'History', stake: 10, seconds: 60 } as const;
    assert.throws(() => completeRound(config, [0]));
    assert.throws(() => completeRound(config, Array(10).fill(4)));
    assert.throws(() => completeRound(config, Array(10).fill(-1)));
    assert.throws(() => completeRound(config, Array(10).fill(0.5)));
    assert.throws(() =>
      completeRound({ ...config, stake: 100 }, Array(10).fill(0)),
    );
  });
  it('provides exactly ten valid public practice fixtures for every shared category', () => {
    const ids = new Set<string>();
    for (const category of CATEGORIES) {
      assert.equal(QUESTIONS[category].length, 10);
      for (const question of QUESTIONS[category]) {
        assert.equal(question.choices.length, 4);
        assert.ok(question.answer >= 0 && question.answer < 4);
        assert.ok(!ids.has(question.id));
        ids.add(question.id);
      }
    }
  });
});
