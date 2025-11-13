// 'use client';
// import { useEffect, useState } from 'react';
// import GradientTextLoading from './TextGradientLoader';

// interface LoadingBarProps {
//   duration?: number; // in seconds, default 240s = 4min,
//   loadcompleted:boolean;
//   setloadcompleted:Function;
// }

// export default function GradientLoadingBar({ duration = 60 ,loadcompleted,setloadcompleted}: LoadingBarProps) {
//   const [progress, setProgress] = useState(0);

//   useEffect(() => {
//     const startTime = Date.now();
//     const timer = setInterval(() => {
//       const elapsed = (Date.now() - startTime) / 1000; // seconds
//       const percentage = Math.min((elapsed / duration) * 100, 100);
//       setProgress(percentage);
//       if(percentage==100) setloadcompleted(true);
//       if (percentage >= 100) clearInterval(timer);
//       if(percentage<100) setloadcompleted(false);

//     }, 500);

//     return () => clearInterval(timer);
//   }, [duration]);

// return (
//   progress !== 100 ? (
//     <div>
//       <div className='mb-1 text-[#ffffff9c] text-sm'>
//         It usually takes 2 min
//       </div>
//       <div className='mb-1 text-white'>
//         We are fetching details of your stock and training our model through which we will be able to make more accurate predictions. Please wait.
//       </div>
//       <GradientTextLoading />

//       <div className="relative w-full h-6 bg-gray-800 rounded-xl overflow-hidden shadow-lg">
//         <div
//           className="h-full rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 animate-gradient-x"
//           style={{ width: `${progress}%`, transition: 'width 1s linear' }}
//         ></div>
//       </div>

//       <span className="font-sans text-xm text-white/50">
//         {Math.floor(progress)}%
//       </span>
//     </div>
//   ) : null
// );

// }






'use client';
import { useEffect, useState } from 'react';
import GradientTextLoading from './TextGradientLoader';

interface LoadingBarProps {
  duration?: number; // in seconds, default 50s
  loadcompleted: boolean;
  setloadcompleted: (completed: boolean) => void;
}

export default function GradientLoadingBar({ duration = 10, loadcompleted, setloadcompleted }: LoadingBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000; // seconds
      const percentage = Math.min((elapsed / duration) * 100, 100);
      setProgress(percentage);

      if (percentage >= 100) {
        setloadcompleted(true);
        clearInterval(timer);
      }

    }, 500);

    return () => clearInterval(timer);
  }, [duration, setloadcompleted]);

  return (
    progress < 100 ? (
      <div>
        <div className='mb-1 text-[#ffffff9c] text-sm'>
          It usually takes around 50 seconds
        </div>
        <div className='mb-1 text-white'>
          We are fetching details of your stock and training our model through which we will be able to make more accurate predictions. Please wait.
        </div>
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
    ) : null
  );
}
