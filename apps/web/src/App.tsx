import { Component, type ReactNode } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { GameProvider } from './game/context';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { HowItWorks } from './pages/HowItWorks';
import { Dashboard } from './pages/Dashboard';
import { Categories } from './pages/Categories';
import { Quiz } from './pages/Quiz';
import { Results } from './pages/Results';
import { Leaderboard } from './pages/Leaderboard';
import { Profile } from './pages/Profile';
import { Button } from './components/ui/button';

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError)
      return (
        <main className="container error-page">
          <p className="eyebrow">A SMALL INTERRUPTION</p>
          <h1>Let’s take that from the top.</h1>
          <p>
            Something didn’t load as expected. Reload to start a fresh practice
            session.
          </p>
          <Button onClick={() => window.location.reload()}>
            <RotateCcw size={16} /> Reload CipherQuiz
          </Button>
        </main>
      );
    return this.props.children;
  }
}
export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <GameProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Landing />} />
              <Route path="how-it-works" element={<HowItWorks />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="categories" element={<Categories />} />
              <Route path="play" element={<Quiz />} />
              <Route path="results" element={<Results />} />
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="profile" element={<Profile />} />
              <Route
                path="*"
                element={
                  <div className="container error-page">
                    <p className="eyebrow">404 / AN UNEXPECTED DETOUR</p>
                    <h1>A question for another day.</h1>
                    <p>
                      We couldn’t find that page. There’s plenty to discover in
                      the playroom.
                    </p>
                    <Button asChild>
                      <Link to="/dashboard">
                        Back to playroom <ArrowRight />
                      </Link>
                    </Button>
                  </div>
                }
              />
            </Route>
          </Routes>
        </GameProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
