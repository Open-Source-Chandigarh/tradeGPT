'use client';
import { useEffect, useState } from "react";

type TextGradientLoaderProps = {
  duration?: number; 
};

const texts = ["Fetching Data", "Cleaning Data", "Training Model"];

export default function TextGradientLoader({ duration = 120 }: TextGradientLoaderProps) {
  const [text, setText] = useState(texts[0]);
  const [dots, setDots] = useState("");

  // Animate dots like "..."
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + "." : ""));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Switch text based on duration
  useEffect(() => {
    const segment = duration / texts.length;
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 500;
      const index = Math.min(Math.floor(elapsed / segment), texts.length - 1);
      setText(texts[index]);
    }, 200);

    return () => clearInterval(interval);
  }, [duration]);

  return (
    <div className="">
      <div className="mb-1   theleement">
        {text}{dots}
      </div>
    </div>
  );
}
