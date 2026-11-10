import { useQuery } from '@tanstack/react-query';
import {
  CATEGORIES,
  DISCLAIMER,
  type HealthResponse,
} from '@cipherquiz/shared';

export function App() {
  const health = useQuery({
    queryKey: ['api-health'],
    queryFn: async () => {
      const response = await fetch('/health/live', {
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) throw new Error('API unavailable');
      return response.json() as Promise<HealthResponse>;
    },
    retry: false,
    refetchInterval: 30000,
  });
  return (
    <div className="shell">
      <header>
        <a className="brand" href="/">
          C<span>◆</span> CipherQuiz
        </a>
        <span className="network">Ethereum Sepolia · Testnet</span>
      </header>
      <main>
        <p className="eyebrow">CONFIDENTIAL WEB3 TRIVIA</p>
        <h1>
          Knowledge is yours.
          <br />
          <span>Keep your edge private.</span>
        </h1>
        <p className="intro">
          Ten questions. Four categories. A new way to put your knowledge to the
          test with confidential computation.
        </p>
        <div className="status">
          <span className="dot" /> Phase 1 · Foundation preview
        </div>
        <section aria-labelledby="categories">
          <div className="section-heading">
            <h2 id="categories">Choose your field</h2>
            <span>Gameplay coming next</span>
          </div>
          <div className="categories">
            {CATEGORIES.map((category, index) => (
              <article key={category}>
                <span className="number">0{index + 1}</span>
                <h3>{category}</h3>
                <p>10 timed questions per round</p>
              </article>
            ))}
          </div>
        </section>
        <section className="roadmap" aria-labelledby="planned">
          <div>
            <p className="eyebrow">THE PLANNED EXPERIENCE</p>
            <h2 id="planned">Stake. Think. Reveal your result.</h2>
            <p>
              Encrypted answers, private scores and confidential test-token
              rewards are planned. This preview accepts no stakes and runs no
              rounds.
            </p>
          </div>
          <div className="tiers">
            <span>
              10 / 10 <strong>2.0×</strong>
            </span>
            <span>
              8–9 / 10 <strong>1.5×</strong>
            </span>
            <span>
              7 / 10 <strong>1.2×</strong>
            </span>
            <span>
              Below 7 <strong>0×</strong>
            </span>
            <small>Planned total return, including stake.</small>
          </div>
        </section>
        <p className="health" role="status">
          API:{' '}
          {health.isPending
            ? 'checking…'
            : health.isError
              ? 'unavailable — start the backend'
              : health.data.status === 'ok'
                ? 'online'
                : 'unavailable'}
        </p>
      </main>
      <footer>
        <p>{DISCLAIMER}</p>
        <span>
          Built independently for the Zama Developer Program · Mainnet Season 5
        </span>
      </footer>
    </div>
  );
}
