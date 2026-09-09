'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

// Shows the logo on a white screen for a beat, then slides the whole
// screen up and out of view, revealing the site underneath.
export default function IntroSplash() {
  const [leaving, setLeaving] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const leaveTimer = setTimeout(() => setLeaving(true), 1000);
    const hideTimer = setTimeout(() => {
      setHidden(true);
      document.body.style.overflow = '';
    }, 1700);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(hideTimer);
      document.body.style.overflow = '';
    };
  }, []);

  if (hidden) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] bg-white flex items-center justify-center transition-transform duration-700 ease-in-out ${
        leaving ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      <div className="animate-[fade-in_0.6s_ease-out_both] flex flex-col items-center">
        <Image src="/logo.png" alt="SS TRANSPORT CORPORATION" width={1063} height={1063} className="w-28 h-28 sm:w-36 sm:h-36 object-contain" priority />
        <p className="mt-2 text-sm font-semibold tracking-wide text-amber-800 uppercase">SS TRANSPORT CORPORATION</p>
      </div>
    </div>
  );
}
