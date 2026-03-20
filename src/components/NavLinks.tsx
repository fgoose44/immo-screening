'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="4.5" r="2.5" fill="currentColor" />
      <path d="M2 12c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function NavLinks() {
  const pathname = usePathname();
  const isDashboard = pathname === '/' || pathname.startsWith('/property');

  return (
    <div className="flex items-center gap-1">
      <Link
        href="/"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] transition-colors ${
          isDashboard
            ? 'bg-brand-primary-lt text-brand-primary font-medium'
            : 'text-content-secondary hover:text-content-primary'
        }`}
      >
        <GridIcon />
        Dashboard
      </Link>
      <span
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] text-content-secondary cursor-default"
      >
        <PersonIcon />
        Objekte
      </span>
    </div>
  );
}
