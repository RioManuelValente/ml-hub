'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [toast, setToast] = useState('')

  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/auth')
      } else {
        setUser(data.user)
        fetchMyArticles(data.user.id)
      }
    })
  }, [])

  async function fetchMyArticles(userId) {
    setLoading(true)

    const { data: articleData } = await supabase
      .from('articles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (!articleData) {
      setLoading(false)
      return
    }

    const { data: articleLikes } = await supabase
      .from('article_likes')
      .select('*')

    const { data: commentData } = await supabase
      .from('comments')
      .select('*')

    const enriched = articleData.map(article => {
      const likes = articleLikes?.filter(l => l.article_id === article.id) || []
      const comments = commentData?.filter(c => c.article_id === article.id) || []
      return {
        ...article,
        likeCount: likes.length,
        commentCount: comments.length,
      }
    }).sort((a, b) => b.likeCount - a.likeCount)

    setArticles(enriched)
    setLoading(false)
  }

  async function handleDelete(articleId) {
    await supabase.from('articles').delete().eq('id', articleId)
    setConfirmDelete(null)
    setArticles(prev => prev.filter(a => a.id !== articleId))
    showToast('Article deleted.')
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function getInitials(email) {
    if (!email) return 'U'
    const parts = email.split('@')[0].split(/[._-]/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return email.slice(0, 2).toUpperCase()
  }

  function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const totalLikes = articles.reduce((sum, a) => sum + a.likeCount, 0)
  const totalComments = articles.reduce((sum, a) => sum + a.commentCount, 0)
  const topArticle = articles.length > 0 ? articles[0] : null

  if (!user) return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-[#0a0f1e] px-6 py-4 flex items-center justify-between">
        <span className="text-blue-400 text-sm tracking-widest font-medium">
          Machine Learning Hub
        </span>
        <div className="flex items-center gap-6">
          <Link href="/" className="text-gray-500 text-xs hover:text-white transition">
            Home
          </Link>
          <Link href="/articles" className="text-gray-500 text-xs hover:text-white transition">
            Articles
          </Link>
          <Link href="/dashboard" className="text-white text-xs">
            Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Welcome hero */}
        <div className="bg-[#0a0f1e] rounded-xl p-5 mb-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-[#1a2540] flex items-center justify-center text-blue-400 text-sm font-medium flex-shrink-0">
            {getInitials(user.email)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              Welcome back!
            </p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href="/articles"
              className="bg-blue-400 text-[#0a0f1e] px-4 py-2 rounded-lg text-xs font-medium hover:bg-blue-300 transition"
            >
              Browse articles
            </Link>
            <button
              onClick={handleLogout}
              className="border border-white/10 text-gray-400 px-4 py-2 rounded-lg text-xs hover:border-white/25 hover:text-white transition"
            >
              Log out
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Articles posted</p>
            <p className="text-2xl font-medium text-gray-900">{articles.length}</p>
            <p className="text-xs text-gray-400 mt-1">by you</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Total likes</p>
            <p className="text-2xl font-medium text-gray-900">{totalLikes}</p>
            <p className="text-xs text-gray-400 mt-1">across all articles</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Total comments</p>
            <p className="text-2xl font-medium text-gray-900">{totalComments}</p>
            <p className="text-xs text-gray-400 mt-1">on your articles</p>
          </div>
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-gray-700">Your articles</p>
          <p className="text-xs text-gray-400">
            {articles.length} {articles.length === 1 ? 'article' : 'articles'} published
          </p>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            <p className="text-sm text-gray-400">Loading your articles...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && articles.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
                <path d="M8 3v10M3 8h10"/>
              </svg>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              You haven't posted any articles yet.
            </p>
            <Link
              href="/articles"
              className="bg-[#0a0f1e] text-white px-5 py-2 rounded-lg text-sm hover:opacity-80 transition inline-block"
            >
              Write your first article
            </Link>
          </div>
        )}

        {/* Articles list */}
        {!loading && articles.map((article, idx) => (
          <div
            key={article.id}
            className="bg-white border border-gray-200 rounded-xl p-5 mb-3"
          >
            {/* Top row: title + badges */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <h2 className="text-sm font-medium text-gray-900 leading-snug flex-1">
                {article.title}
              </h2>
              <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                {idx === 0 && article.likeCount > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                    Most liked
                  </span>
                )}
                {article.likeCount >= 3 && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    {article.likeCount} likes
                  </span>
                )}
                {article.commentCount >= 2 && (
                  <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                    {article.commentCount} comments
                  </span>
                )}
              </div>
            </div>

            {/* Body excerpt */}
            <p className="text-xs text-gray-400 leading-relaxed mb-4 line-clamp-2">
              {article.body}
            </p>

            {/* Footer row */}
            <div className="flex items-center gap-3 border-t border-gray-100 pt-3">

              {/* Like count */}
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M8 13.5S1.5 9.5 1.5 5.5A3.5 3.5 0 018 3.2 3.5 3.5 0 0114.5 5.5C14.5 9.5 8 13.5 8 13.5z"/>
                </svg>
                {article.likeCount} {article.likeCount === 1 ? 'like' : 'likes'}
              </div>

              {/* Comment count */}
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M2 3h12a1 1 0 011 1v6a1 1 0 01-1 1H5l-3 3V4a1 1 0 011-1z"/>
                </svg>
                {article.commentCount} {article.commentCount === 1 ? 'comment' : 'comments'}
              </div>

              {/* Time */}
              <span className="text-xs text-gray-400 ml-auto">
                {timeAgo(article.created_at)}
              </span>

              {/* Delete button */}
              <button
                onClick={() => setConfirmDelete(article.id)}
                className="flex items-center gap-1.5 border border-gray-200 rounded-full px-3 py-1.5 text-xs text-gray-400 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition"
              >
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9"/>
                </svg>
                Delete
              </button>
            </div>

            {/* Delete confirmation */}
            {confirmDelete === article.id && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-3 flex-wrap">
                <p className="text-xs text-red-700 flex-1">
                  Delete this article? This cannot be undone.
                </p>
                <button
                  onClick={() => handleDelete(article.id)}
                  className="bg-red-500 text-white rounded-lg px-3 py-1.5 text-xs hover:bg-red-600 transition"
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="border border-red-200 text-red-600 rounded-lg px-3 py-1.5 text-xs hover:bg-red-100 transition"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0a0f1e] text-white text-xs px-5 py-2.5 rounded-full z-50">
          {toast}
        </div>
      )}
    </main>
  )
}