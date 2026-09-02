import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import './Home.css';

export function Home() {
  const { profile } = useAuth();

  const firstName = profile?.fullName?.split(' ')[0] ?? 'there';

  return (
    <div className="home-page">
      <section className="home-header">
        <p className="home-eyebrow">CAMPUS PORTAL</p>
        <h1>Welcome, {firstName}.</h1>
        <p className="home-subtitle">
          Everything you need, in one place.
        </p>
      </section>

      <section className="home-cards">
        <Link to="/queries" className="home-card">
          <div className="home-card-icon">?</div>
          <div>
            <h2>Queries</h2>
            <p>
              Ask questions, track tickets, and stay updated on responses.
            </p>
          </div>
          <span className="home-card-arrow">→</span>
        </Link>

        <Link to="/attendance" className="home-card">
          <div className="home-card-icon">✓</div>
          <div>
            <h2>Attendance</h2>
            <p>
              View your attendance and keep track of your academic progress.
            </p>
          </div>
          <span className="home-card-arrow">→</span>
        </Link>

        <Link to="/resources" className="home-card">
          <div className="home-card-icon">▤</div>
          <div>
            <h2>Documents</h2>
            <p>
              Access course materials, notes, and other academic resources.
            </p>
          </div>
          <span className="home-card-arrow">→</span>
        </Link>
      </section>
    </div>
  );
}