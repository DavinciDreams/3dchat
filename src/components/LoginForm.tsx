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
      className="w-full max-w-md mx-auto bg-white/10 backdrop-blur-lg p-6 rounded-lg shadow-xl border border-white/20"
    >
      <h2 className="text-2xl font-bold mb-6 text-center">
        {isLogin ? 'Welcome Back' : 'Create Account'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 rounded-md bg-white/5 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            placeholder="Enter your email"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 rounded-md bg-white/5 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
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
          className="w-full py-2 px-4 bg-teal-500 text-white rounded-md hover:bg-teal-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          className="w-full text-sm text-white/70 hover:text-white transition-colors"
        >
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </form>
    </motion.div>
  );
};

export default LoginForm;