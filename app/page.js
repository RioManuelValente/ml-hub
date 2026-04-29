import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center px-6 text-center">
      <p className="text-blue-400 text-sm tracking-widest uppercase mb-6 border border-blue-400/30 rounded-full px-4 py-1">
        Machine Learning Hub
      </p>
      <h1 className="text-5xl font-serif text-white mb-6 leading-tight">
        Learn. Build. <br />
        <span className="text-blue-400 italic">Explore ML.</span>
      </h1>
      <p className="text-gray-400 text-base max-w-md mb-10 leading-relaxed">
        A simple integrated platform for discovering machine learning concepts,
        tools, and resources — powered by modern cloud services.
      </p>
      <Link
        href="/auth"
        className="bg-blue-400 text-[#0a0f1e] font-semibold px-8 py-3 rounded-lg hover:bg-blue-300 transition"
      >
        Get Started →
      </Link>
    </main>
  )
}