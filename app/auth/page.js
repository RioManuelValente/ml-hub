'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSignUp() {
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('Sign-up successful! Check your email to confirm your account.')
    }
    setLoading(false)
  }

  async function handleLogin() {
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="flex w-full max-w-2xl rounded-xl overflow-hidden shadow border border-gray-200">

        {/* Left side panel */}
        <div className="w-2/5 bg-[#0a0f1e] p-10 flex flex-col justify-between">
          <div>
            <p className="text-xs text-blue-400 border border-blue-400/30 rounded-full px-3 py-1 inline-block mb-6">
              Machine Learning Hub
            </p>
            <h2 className="text-white text-xl font-serif mb-3">Welcome back</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Sign in to access your personalized ML learning dashboard.
            </p>
          </div>
          <ul className="space-y-2 mt-8">
            {['Curated ML resources', 'Track your progress', 'Community access', 'Project workspace'].map(item => (
              <li key={item} className="flex items-center gap-2 text-gray-400 text-xs border-b border-white/5 pb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Right side form */}
        <div className="flex-1 p-10 flex flex-col justify-center bg-white">
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-700 mb-4 block">← Back to home</Link>
          <h2 className="text-xl font-serif text-gray-800 mb-1">Sign in or create an account</h2>
          <p className="text-sm text-gray-400 mb-6">Enter your email and password below.</p>

          <label className="text-xs text-gray-500 mb-1 block">Email address</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-4 outline-none focus:border-blue-400"
          />

          <label className="text-xs text-gray-500 mb-1 block">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-5 outline-none focus:border-blue-400"
          />

          <div className="flex gap-3">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="flex-1 bg-[#0a0f1e] text-white rounded-lg py-2.5 text-sm hover:opacity-80 transition"
            >
              {loading ? 'Loading...' : 'Log in'}
            </button>
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm hover:bg-gray-50 transition"
            >
              {loading ? 'Loading...' : 'Sign up'}
            </button>
          </div>

          {message && (
            <p className={`mt-4 text-sm ${message.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}