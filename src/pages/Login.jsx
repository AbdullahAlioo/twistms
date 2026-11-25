import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ScrollReveal from '../components/common/ScrollReveal';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn({ email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      await signIn({ email: 'seller@twistms.com', password: 'demo-password' });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed demo sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
      <ScrollReveal direction="down">
        <div className="text-center mb-8">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#6E6E6E] font-extrabold">
            Seller & Agent Portal
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111111] font-editorial mt-1">
            Access Your Seller Account
          </h1>
          <p className="text-xs text-[#555555] mt-2">
            Monitor real-time listing views, manage syndication plans, and respond to buyer inquiries.
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal direction="up" delay={50}>
        <div className="glass-panel-luxury p-8 rounded-3xl border border-[#2B2B2B]/15 bg-white shadow-xl">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1.5 font-bold">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@agency.com"
                className="w-full bg-white text-xs text-[#111111] font-medium border border-[#2B2B2B]/25 rounded-xl px-4 py-3 placeholder:text-[#888888] focus:outline-none focus:border-[#B4B4B4] shadow-sm"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[11px] font-mono text-[#111111] uppercase font-bold">
                  Password
                </label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-white text-xs text-[#111111] font-medium border border-[#2B2B2B]/25 rounded-xl px-4 py-3 placeholder:text-[#888888] focus:outline-none focus:border-[#B4B4B4] shadow-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl text-xs font-bold btn-luxury shadow-md transition-all cursor-pointer"
            >
              {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-[#2B2B2B]/10 text-center space-y-3">
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#F5F5F5] hover:bg-[#EAEAEA] text-[#222222] border border-[#2B2B2B]/15 transition-all"
            >
              ⚡ Instant Demo Seller Login (Marcus Vance)
            </button>

            <p className="text-xs text-[#555555]">
              Don't have a seller account yet?{' '}
              <Link to="/register" className="font-bold text-[#111111] underline hover:text-black">
                Create Account & Pick Plan
              </Link>
            </p>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
