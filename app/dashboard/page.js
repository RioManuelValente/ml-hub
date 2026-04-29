'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/auth')
      } else {
        setUser(data.user)
      }
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!user) return <p className="p-10 text-gray-500">Loading...</p>

  return (
    <main className="min-h-screen bg-[#0a0f1e] flex items-center justify-center px-6">
      <div className="bg-white rounded-xl p-10 max-w-md w-full text-center shadow">
        <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold mx-auto mb-4">
          {user.email[0].toUpperCase()}
        </div>
        <h1 className="text-2xl font-serif text-gray-800 mb-2">Welcome back!</h1>
        <p className="text-sm text-gray-500 mb-6">Logged in as <strong>{user.email}</strong></p>
        <button
          onClick={handleLogout}
          className="bg-[#0a0f1e] text-white px-6 py-2.5 rounded-lg text-sm hover:opacity-80 transition"
        >
          Log out
        </button>
      </div>
    </main>
  )
}