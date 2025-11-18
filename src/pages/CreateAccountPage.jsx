import React, { useState } from 'react';
import { signUp } from '../lib/supabaseAuth';
import { useNavigate, Link } from 'react-router-dom';

export default function CreateAccountPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signUp({ email, password, data: { name } });
    setLoading(false);
    if (res.error) {
      setError(res.error.message || JSON.stringify(res.error));
      return;
    }
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-5xl font-extrabold text-[#003366] mb-2">
          ScriptMaster
        </h1>
        <h2 className="mt-4 text-center text-2xl font-semibold text-[#212529]">
          Create your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
              <p className="text-lg text-red-700 font-semibold">
                {error}
              </p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-lg font-semibold text-gray-700 mb-2">
                Name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                  placeholder="Your name"
                  className="appearance-none block w-full px-4 py-3 text-lg border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#00a8e8] focus:border-[#00a8e8]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-lg font-semibold text-gray-700 mb-2">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  className="appearance-none block w-full px-4 py-3 text-lg border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#00a8e8] focus:border-[#00a8e8]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-lg font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  placeholder="Create a password"
                  className="appearance-none block w-full px-4 py-3 text-lg border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#00a8e8] focus:border-[#00a8e8]"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-semibold text-white bg-[#003366] hover:bg-[#0055a4] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00a8e8] disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-300"
              >
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center border-t border-gray-200 pt-6">
            <p className="text-base text-gray-700">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-[#003366] hover:text-[#0055a4]"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
