import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface LoginFormProps {
  onSuccess: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto bg-gradient-to-br from-blue-700 via-blue-500 to-teal-400 p-8 rounded-xl shadow-2xl border border-blue-200/30 z-30 relative"
      style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)' }}
    >
      <h2 className="text-2xl font-bold mb-6 text-center">
        {isLogin ? 'Welcome Back' : 'Create Account'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold mb-1 text-white drop-shadow">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 rounded-md bg-white/90 border border-blue-200 text-blue-900 placeholder:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/70 shadow"
            placeholder="Enter your email"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-semibold mb-1 text-white drop-shadow">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 rounded-md bg-white/90 border border-blue-200 text-blue-900 placeholder:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/70 shadow"
            placeholder="Enter your password"
            required
          />
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-400 text-sm mt-2"
          >
            {error}
          </motion.div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isLogin ? (
            <>
              <LogIn className="h-5 w-5" />
              <span>Sign In</span>
            </>
          ) : (
            <>
              <UserPlus className="h-5 w-5" />
              <span>Sign Up</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="w-full text-sm text-white/90 hover:text-yellow-200 transition-colors mt-2 drop-shadow"
        >
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </form>
    </motion.div>
  );
};

export default LoginForm;