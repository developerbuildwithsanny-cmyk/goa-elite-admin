'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { Loader2, Lock } from 'lucide-react'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await supabase.auth.signInWithPassword({ email, password })

      const { error: authError } = response
      if (authError) {
        setError(authError.message || 'Invalid credentials. Please try again.')
        setLoading(false)
      } else {
        router.push('/')
      }
    } catch (err: any) {
      console.error('[Login] Caught unexpected exception:', err)
      setError(err?.message || 'An unexpected error occurred. Check console.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="glass-dark rounded-2xl p-8 w-full max-w-md border border-[#c9a84c]/30">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl gold-gradient flex items-center justify-center mx-auto mb-4">
            <Lock className="text-black" size={24} />
          </div>
          <h1 className="font-playfair text-2xl font-bold text-[#c9a84c]">Admin Login</h1>
          <p className="text-gray-500 text-sm mt-1">Goa Elite Experience Dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          <div>
            <label htmlFor="admin-email" className="text-gray-400 text-xs block mb-1">Email</label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@goaelite.com"
              required
              className="input-dark"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="text-gray-400 text-xs block mb-1">Password</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="input-dark"
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            id="admin-login-btn"
            disabled={loading}
            className="w-full gold-gradient text-black font-bold py-3.5 rounded-xl 
                       hover:opacity-90 transition-all flex items-center justify-center gap-2 
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? 'Logging in…' : 'Login to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  )
}
