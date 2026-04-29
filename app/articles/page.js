'use client'

import { useEffect, useState } from 'react'
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
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/auth')
      } else {
        setUser(data.user)
        fetchArticles(data.user.id)
      }
    })
  }, [])

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
    }
    fetchArticles(user.id)
  }

  async function toggleCommentLike(comment) {
    if (comment.liked) {
      await supabase.from('comment_likes').delete().eq('id', comment.myLikeId)
    } else {
      await supabase.from('comment_likes').insert({
        comment_id: comment.id,
        user_id: user.id,
      })
    }
    fetchArticles(user.id)
  }

  async function handleComment(articleId) {
    const text = (commentInputs[articleId] || '').trim()
    if (!text) return
    setPostingComment(prev => ({ ...prev, [articleId]: true }))
    await supabase.from('comments').insert({
      article_id: articleId,
      body: text,
      user_id: user.id,
      user_email: user.email,
    })
    setCommentInputs(prev => ({ ...prev, [articleId]: '' }))
    setPostingComment(prev => ({ ...prev, [articleId]: false }))
    fetchArticles(user.id)
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
    const index = email.charCodeAt(0) % avatarColors.length
    return avatarColors[index]
  }

  function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

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
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Post new article */}
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

        {/* Feed label */}
        <p className="text-xs font-medium text-gray-400 tracking-widest uppercase mb-3">
          Articles — sorted by most liked
        </p>

        {/* Articles */}
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

            {/* Article content */}
            <h2 className="text-base font-medium text-gray-900 mb-1">{article.title}</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-4">{article.body}</p>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleArticleLike(article)}
                className={`flex items-center gap-1.5 border rounded-full px-3 py-1.5 text-xs transition ${
                  article.liked
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill={article.liked ? '#185FA5' : 'none'} stroke={article.liked ? '#185FA5' : 'currentColor'} strokeWidth="1.5">
                  <path d="M8 13.5S1.5 9.5 1.5 5.5A3.5 3.5 0 018 3.2 3.5 3.5 0 0114.5 5.5C14.5 9.5 8 13.5 8 13.5z"/>
                </svg>
                {article.likeCount} {article.likeCount === 1 ? 'like' : 'likes'}
              </button>
              <button
                onClick={() => toggleComments(article.id)}
                className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition"
              >
                {openComments[article.id] ? 'Hide' : 'Show'} comments ({article.comments.length})
              </button>
            </div>

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
                        onClick={() => toggleCommentLike(comment)}
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

                {/* Comment input */}
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={commentInputs[article.id] || ''}
                    onChange={e => setCommentInputs(prev => ({ ...prev, [article.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleComment(article.id)}
                    placeholder="Add a comment..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400 bg-white"
                  />
                  <button
                    onClick={() => handleComment(article.id)}
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
    </main>
  )
}