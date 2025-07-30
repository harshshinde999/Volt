import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TypeAnimation } from 'react-type-animation';

export function Home() {
  const [prompt, setPrompt] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (prompt.trim()) {
      navigate('/builder', { state: { prompt } });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#090E24] via-[#0F172A] to-[#090E24] text-white flex items-center justify-center px-4 md:px-6 py-16 relative overflow-hidden">
      {/* Floating Orbs */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-blue-500/10 blur-2xl"
          style={{
            width: `${30 + Math.random() * 100}px`,
            height: `${30 + Math.random() * 100}px`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 6 + Math.random() * 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Main Card */}
      <div className="relative z-10 max-w-6xl w-full flex flex-col md:flex-row items-center gap-12 bg-white/5 backdrop-blur-md rounded-3xl p-6 md:p-12 shadow-xl border border-white/10 overflow-hidden">
        {/* Glow Layer */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30 blur-2xl"
          style={{
            background:
              'radial-gradient(circle at 25% 30%, rgba(99,102,241,0.3), transparent 40%), radial-gradient(circle at 75% 75%, rgba(236,72,153,0.3), transparent 40%)',
          }}
        />

        {/* Left: Text */}
        <div className="flex-1 space-y-6 text-center md:text-left relative z-10">
          <h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl  font-extrabold leading-tight tracking-tight bg-gradient-to-br from-blue-400 via-cyan-400 to-purple-500 bg-clip-text text-transparent drop-shadow-md"
          >
            Build with
            <br />
            <span className="text-blue-400"> Volt </span>
          </h1>

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="bg-gray-900/60 backdrop-blur-md shadow-lg border border-gray-700 rounded-2xl px-4 py-5 max-w-xl mx-auto md:mx-0 text-gray-100 text-base sm:text-lg font-medium font-sans whitespace-pre-line"
            style={{ minHeight: '10rem' }}
          >
            <TypeAnimation
              sequence={[
                "No meetings. No noise. No nonsense. Just pure creation, powered by your ideas and instant results.",
                2000,
                "",
                800,
              ]}
              speed={10}
              deletionSpeed={12}
              repeat={Infinity}
              wrapper="p"
              omitDeletionAnimation={true}
              cursor={true}
              className="text-base sm:text-lg md:text-xl leading-relaxed tracking-wide font-mono select-text drop-shadow-lg"
              style={{
                background: 'linear-gradient(90deg, #93c5fd, #60a5fa, #3b82f6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            />
          </motion.div>
        </div>

        {/* Right: Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-xl relative z-10">
          <div className="bg-black/60 p-6 sm:p-8 rounded-3xl border border-white/10 shadow-[inset_0_0_0_2px_rgba(110,51,234,0.2),0_0_20px_rgba(59,130,246,0.3)] backdrop-blur-xl space-y-6">
            {/* Glow behind form */}
            <div
              className="absolute inset-0 rounded-3xl pointer-events-none opacity-25 blur-2xl"
              style={{
                background:
                  'radial-gradient(circle at 20% 20%, rgba(99,102,241,0.3), transparent 40%), radial-gradient(circle at 80% 80%, rgba(236,72,153,0.3), transparent 40%)',
              }}
            />

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your dream idea here..."
              className="w-full h-40 sm:h-48 md:h-56 resize-none bg-white/10 text-white text-base sm:text-lg placeholder-gray-300 p-4 sm:p-5 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            <button
              type="submit"
              className="w-full bg-blue-400 text-white font-bold text-base sm:text-lg py-3 px-6 rounded-xl shadow-md hover:translate-y-0.5 active:translate-y-1 transition-all duration-200"
            >
              Generate Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
