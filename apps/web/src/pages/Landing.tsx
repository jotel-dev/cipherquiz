import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowRight, FlaskConical, Play, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Reveal } from '../components/ui/reveal';
import { TriviaPreview } from '../components/TriviaPreview';

export function Landing() {
  const { hash } = useLocation();
  // Keep links from the original landing page useful after moving its content.
  const legacyLinks: Record<string, string> = {
    '#how-it-works': '/how-it-works',
    '#privacy': '/how-it-works#confidentiality',
    '#categories': '/categories',
  };
  const legacy = legacyLinks[hash];
  if (legacy) return <Navigate to={legacy} replace />;
  return (
    <>
      <section className="hero container" aria-labelledby="home-title">
        <Reveal className="hero-copy">
          <p className="hero-eyebrow">
            <ShieldCheck size={15} /> Confidential trivia, reimagined
          </p>
          <h1 id="home-title">
            Play trivia.
            <br />
            <span className="heading-accent">Keep your edge.</span>
          </h1>
          <p className="hero-description">
            Ten questions. A curious mind. A new way to play trivia, designed
            around your privacy.
          </p>
          <div className="hero-actions">
            <Button asChild size="large">
              <Link to="/dashboard">
                <Play size={15} fill="currentColor" />
                Play Now
                <ArrowRight size={17} />
              </Link>
            </Button>
            <Button asChild variant="outline" size="large">
              <Link to="/how-it-works">How It Works</Link>
            </Button>
          </div>
          <p className="hero-practice">
            <FlaskConical size={15} /> Free practice. No wallet needed.
          </p>
          <p className="hero-development">
            Live encrypted gameplay is in development.
          </p>
        </Reveal>
        <Reveal className="hero-visual" delay={80}>
          <TriviaPreview />
        </Reveal>
      </section>
      <div className="home-footnote container">
        <ShieldCheck size={17} />
        <p>A game for curious minds. A future built around confidentiality.</p>
        <Link to="/how-it-works#confidentiality">
          Our approach to privacy <ArrowRight size={14} />
        </Link>
      </div>
    </>
  );
}
