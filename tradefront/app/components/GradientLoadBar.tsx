'use client';
import { useEffect, useState } from 'react';
import GradientTextLoading from './TextGradientLoader';

interface LoadingBarProps {
  duration?: number; // in seconds, default 240s = 4min
}

export default function GradientLoadingBar({ duration = 240 }: LoadingBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000; // seconds
      const percentage = Math.min((elapsed / duration) * 100, 100);
      setProgress(percentage);
      if (percentage >= 100) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [duration]);

  return (
    <div>
    <div className='mb-1 text-[#ffffff9c] text-sm'>It Usually takes 4 min</div>
    <div className='mb-1 text-white '>We are fetching detilas of your stock and traning our model though which we will be able to make more acurate predictions please wait </div>
    <GradientTextLoading />
    <div className="relative w-full h-6 bg-gray-800 rounded-xl overflow-hidden shadow-lg">
      <div
        className="h-full rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 animate-gradient-x"
        style={{ width: `${progress}%`, transition: 'width 1s linear' }}
      ></div>

    </div>
        <span className="font-sans text-xm text-white/50">
        {Math.floor(progress)}%
        </span>

    </div>
  );
}
