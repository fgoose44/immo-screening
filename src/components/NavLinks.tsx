'use client';

import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';

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

export default function NavLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isDashboard = pathname === '/' || pathname.startsWith('/property');

  const cityParam = searchParams.get('city') as 'Leipzig' | 'Dresden' | null;
  const activeCity = cityParam ?? 'all';

  function setCity(c: 'all' | 'Leipzig' | 'Dresden') {
    const params = new URLSearchParams(searchParams.toString());
    if (c === 'all') {
      params.delete('city');
    } else {
      params.set('city', c);
    }
    router.push(`/?${params.toString()}`);
  }

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
        Objekte
      </Link>

      {/* Trennlinie */}
      <span className="w-px h-4 bg-border mx-1" />

      {/* Stadt-Filter-Chips */}
      {(['all', 'Leipzig', 'Dresden'] as const).map((c) => (
        <button
          key={c}
          onClick={() => setCity(c)}
          className={[
            'px-3 py-1 rounded-full text-[12px] border transition-colors',
            activeCity === c
              ? 'bg-[#EEEDF9] text-[#7A74C2] border-[#C9C6EC] font-medium'
              : 'bg-[#F2F4FA] text-[#8A8EA8] border-[#E4E7F2] hover:border-[#C9C6EC] hover:text-[#7A74C2]',
          ].join(' ')}
        >
          {c === 'all' ? 'Alle' : c}
        </button>
      ))}
    </div>
  );
}
