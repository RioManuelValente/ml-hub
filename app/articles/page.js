'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ArticlesPage() {
  const [user, setUser] = useState(null)
  const [articles, setArticles] = useState([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [openComments, setOpenComments] = useState({})
  const [commentInputs, setCommentInputs] = useState({})
  const [postingComment, setPostingComment] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [toast, setToast] = useState('')
  const [notifications, setNotifications] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/auth')
      } else {
        setUser(data.user)
        fetchArticles(data.user.id)
        fetchNotifications(data.user.id)
        subscribeToNotifications(data.user.id)
      }
    })
  }, [])

  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function subscribeToNotifications(userId) {
    supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev])
        }
      )
      .subscribe()
  }

  async function fetchNotifications(userId) {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setNotifications(data)
  }

  async function markNotifRead(id) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    )
  }

  async function markAllRead() {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  async function fetchArticles(userId) {
    const { data: articleData } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })
    if (!articleData) return

    const { data: articleLikes } = await supabase
      .from('article_likes')
      .select('*')
    const { data: commentData } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: true })
    const { data: commentLikes } = await supabase
      .from('comment_likes')
      .select('*')

    const enriched = articleData.map(article => {
      const likes = articleLikes?.filter(l => l.article_id === article.id) || []
      const myLike = likes.find(l => l.user_id === userId)
      const articleComments = (commentData || [])
        .filter(c => c.article_id === article.id)
        .map(c => {
          const cLikes = commentLikes?.filter(l => l.comment_id === c.id) || []
          const myCommentLike = cLikes.find(l => l.user_id === userId)
          return {
            ...c,
            likeCount: cLikes.length,
            myLikeId: myCommentLike?.id || null,
            liked: !!myCommentLike,
          }
        })
        .sort((a, b) => b.likeCount - a.likeCount)
      return {
        ...article,
        likeCount: likes.length,
        myLikeId: myLike?.id || null,
        liked: !!myLike,
        comments: articleComments,
      }
    }).sort((a, b) => b.likeCount - a.likeCount)

    setArticles(enriched)
  }

  async function handlePost() {
    if (!title.trim() || !body.trim()) return
    setPosting(true)
    await supabase.from('articles').insert({
      title: title.trim(),
      body: body.trim(),
      user_id: user.id,
      user_email: user.email,
    })
    setTitle('')
    setBody('')
    setPosting(false)
    fetchArticles(user.id)
  }

  async function toggleArticleLike(article) {
    if (article.liked) {
      await supabase.from('article_likes').delete().eq('id', article.myLikeId)
    } else {
      await supabase.from('article_likes').insert({
        article_id: article.id,
        user_id: user.id,
      })
      if (article.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: article.user_id,
          type: 'article_like',
          message: `${user.email} liked your article "${article.title}"`,
          article_id: article.id,
        })
      }
    }
    fetchArticles(user.id)
  }

  async function toggleCommentLike(comment, articleUserId) {
    if (comment.liked) {
      await supabase.from('comment_likes').delete().eq('id', comment.myLikeId)
    } else {
      await supabase.from('comment_likes').insert({
        comment_id: comment.id,
        user_id: user.id,
      })
      if (comment.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: comment.user_id,
          type: 'comment_like',
          message: `${user.email} liked your comment`,
          article_id: comment.article_id,
        })
      }
    }
    fetchArticles(user.id)
  }

  async function handleComment(articleId, articleUserId, articleTitle) {
    const text = (commentInputs[articleId] || '').trim()
    if (!text) return
    setPostingComment(prev => ({ ...prev, [articleId]: true }))
    await supabase.from('comments').insert({
      article_id: articleId,
      body: text,
      user_id: user.id,
      user_email: user.email,
    })
    if (articleUserId !== user.id) {
      await supabase.from('notifications').insert({
        user_id: articleUserId,
        type: 'comment',
        message: `${user.email} commented on your article "${articleTitle}"`,
        article_id: articleId,
      })
    }
    setCommentInputs(prev => ({ ...prev, [articleId]: '' }))
    setPostingComment(prev => ({ ...prev, [articleId]: false }))
    fetchArticles(user.id)
  }

  async function handleDelete(articleId) {
    await supabase.from('articles').delete().eq('id', articleId)
    setConfirmDelete(null)
    setArticles(prev => prev.filter(a => a.id !== articleId))
    showToast('Article deleted.')
  }

  function handleShare(articleId) {
    const url = `${window.location.origin}/articles?id=${articleId}`
    navigator.clipboard.writeText(url).catch(() => {})
    showToast('Link copied to clipboard!')
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  function toggleComments(id) {
    setOpenComments(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function getInitials(email) {
    return email ? email.slice(0, 2).toUpperCase() : 'U'
  }

  const avatarColors = [
    'bg-blue-100 text-blue-800',
    'bg-teal-100 text-teal-800',
    'bg-orange-100 text-orange-800',
    'bg-purple-100 text-purple-800',
    'bg-pink-100 text-pink-800',
  ]

  function getAvatarColor(email) {
    if (!email) return avatarColors[0]
    return avatarColors[email.charCodeAt(0) % avatarColors.length]
  }

  function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (!user) return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-[#0a0f1e] px-6 py-4 flex items-center justify-between">
        <span className="text-blue-400 text-sm tracking-widest font-medium">Machine Learning Hub</span>
        <div className="flex items-center gap-6">
          <Link href="/" className="text-gray-500 text-xs hover:text-white transition">Home</Link>
          <Link href="/articles" className="text-white text-xs">Articles</Link>
          <Link href="/dashboard" className="text-gray-500 text-xs hover:text-white transition">Dashboard</Link>

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(prev => !prev)}
              className="relative p-1.5 rounded-lg hover:bg-white/10 transition"
              aria-label="Notifications"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#8b9ec9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 2a6 6 0 0 0-6 6v3l-1.5 2.5h15L16 11V8a6 6 0 0 0-6-6z"/>
                <path d="M8.5 17a1.5 1.5 0 0 0 3 0"/>
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-medium leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {notifOpen && (
              <div className="absolute right-0 top-10 w-72 bg-white border border-gray-200 rounded-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                  <span className="text-xs font-medium text-gray-800">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-blue-600 hover:text-blue-800 transition"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">No notifications yet</p>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => markNotifRead(n.id)}
                        className={`flex gap-2.5 px-4 py-3 border-b border-gray-50 cursor-pointer transition text-left ${
                          n.is_read ? 'hover:bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.is_read ? 'bg-transparent' : 'bg-blue-500'}`} />
                        <div>
                          <p className="text-xs text-gray-700 leading-relaxed">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.created_at)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Post box */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Share an ML article</p>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Article title..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-2 outline-none focus:border-blue-400 bg-gray-50"
          />
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write your article content here..."
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-3 outline-none focus:border-blue-400 bg-gray-50 resize-none"
          />
          <button
            onClick={handlePost}
            disabled={posting}
            className="bg-[#0a0f1e] text-white px-5 py-2 rounded-lg text-sm hover:opacity-80 transition"
          >
            {posting ? 'Publishing...' : 'Publish article'}
          </button>
        </div>

        <p className="text-xs font-medium text-gray-400 tracking-widest uppercase mb-3">
          Articles — sorted by most liked
        </p>

        {articles.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-12">No articles yet. Be the first to post!</p>
        )}

        {articles.map((article, idx) => (
          <div key={article.id} className="bg-white border border-gray-200 rounded-xl p-5 mb-4">

            {/* Author row */}
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${getAvatarColor(article.user_email)}`}>
                {getInitials(article.user_email)}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-800">{article.user_email}</p>
                <p className="text-xs text-gray-400">{timeAgo(article.created_at)}</p>
              </div>
              {idx === 0 && article.likeCount > 0 && (
                <span className="ml-auto text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
                  Most liked
                </span>
              )}
            </div>

            <h2 className="text-base font-medium text-gray-900 mb-1">{article.title}</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-4">{article.body}</p>

            {/* Action row */}
            <div className="flex items-center gap-2 flex-wrap">

              {/* Like */}
              <button
                onClick={() => toggleArticleLike(article)}
                className={`flex items-center gap-1.5 border rounded-full px-3 py-1.5 text-xs transition ${
                  article.liked
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill={article.liked ? '#185FA5' : 'none'} stroke={article.liked ? '#185FA5' : 'currentColor'} strokeWidth="1.5">
                  <path d="M8 13.5S1.5 9.5 1.5 5.5A3.5 3.5 0 018 3.2 3.5 3.5 0 0114.5 5.5C14.5 9.5 8 13.5 8 13.5z"/>
                </svg>
                {article.likeCount} {article.likeCount === 1 ? 'like' : 'likes'}
              </button>

              {/* Comments toggle */}
              <button
                onClick={() => toggleComments(article.id)}
                className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition"
              >
                {openComments[article.id] ? 'Hide' : 'Show'} comments ({article.comments.length})
              </button>

              {/* Share */}
              <button
                onClick={() => handleShare(article.id)}
                className="flex items-center gap-1.5 border border-gray-200 rounded-full px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 transition"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="12" cy="4" r="1.5"/><circle cx="4" cy="8" r="1.5"/><circle cx="12" cy="12" r="1.5"/>
                  <path d="M5.5 7.1l5-2.2M5.5 8.9l5 2.2"/>
                </svg>
                Share
              </button>

              {/* Delete — only for the author */}
              {article.user_id === user.id && (
                <button
                  onClick={() => setConfirmDelete(article.id)}
                  className="flex items-center gap-1.5 border border-gray-200 rounded-full px-3 py-1.5 text-xs text-gray-400 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition ml-auto"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9"/>
                  </svg>
                  Delete
                </button>
              )}
            </div>

            {/* Delete confirmation */}
            {confirmDelete === article.id && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-3 flex-wrap">
                <p className="text-xs text-red-700 flex-1">Delete this article? This cannot be undone.</p>
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

            {/* Comments */}
            {openComments[article.id] && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                {article.comments.length === 0 && (
                  <p className="text-xs text-gray-400 mb-3">No comments yet. Be the first!</p>
                )}
                {article.comments.map(comment => (
                  <div key={comment.id} className="flex gap-2 mb-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${getAvatarColor(comment.user_email)}`}>
                      {getInitials(comment.user_email)}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs font-medium text-gray-700 mb-0.5">{comment.user_email}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{comment.body}</p>
                      <button
                        onClick={() => toggleCommentLike(comment, article.user_id)}
                        className={`flex items-center gap-1 mt-1.5 text-xs transition ${
                          comment.liked ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        <svg width="11" height="11" viewBox="0 0 16 16" fill={comment.liked ? '#185FA5' : 'none'} stroke={comment.liked ? '#185FA5' : 'currentColor'} strokeWidth="1.5">
                          <path d="M8 13.5S1.5 9.5 1.5 5.5A3.5 3.5 0 018 3.2 3.5 3.5 0 0114.5 5.5C14.5 9.5 8 13.5 8 13.5z"/>
                        </svg>
                        {comment.likeCount}
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={commentInputs[article.id] || ''}
                    onChange={e => setCommentInputs(prev => ({ ...prev, [article.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleComment(article.id, article.user_id, article.title)}
                    placeholder="Add a comment..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400 bg-white"
                  />
                  <button
                    onClick={() => handleComment(article.id, article.user_id, article.title)}
                    disabled={postingComment[article.id]}
                    className="bg-[#0a0f1e] text-white rounded-lg px-4 py-2 text-xs hover:opacity-80 transition"
                  >
                    {postingComment[article.id] ? '...' : 'Post'}
                  </button>
                </div>
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