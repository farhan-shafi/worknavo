import { Link } from 'react-router-dom';

import { cn } from '../../lib/utils';

export function WorkNavoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'grid size-10 place-items-center rounded-xl bg-[#17212B] text-[#FFF7EE] shadow-lg shadow-slate-900/10',
        className,
      )}
    >
      <svg
        aria-hidden="true"
        className="size-7"
        fill="none"
        viewBox="0 0 48 48"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M34.6 10.9 12.4 22.7c-2 .99-1.6 3.9.58 4.5l9.5 2.45 2.45 9.46c.57 2.2 3.5 2.55 4.5.58l11.8-22.2c1.67-3.14-3.45-8.26-6.62-6.6Z"
          fill="#F05A24"
        />
        <circle cx="24" cy="24" fill="#FFF7EE" r="4" />
      </svg>
    </span>
  );
}

export function WorkNavoWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'text-lg font-extrabold tracking-[-0.035em] text-[#17212B]',
        className,
      )}
    >
      Work<span className="text-[#F05A24]">Navo</span>
    </span>
  );
}

export function WorkNavoLogo({
  className,
  to = '/',
}: {
  className?: string;
  to?: string;
}) {
  return (
    <Link className={cn('inline-flex items-center gap-2.5', className)} to={to}>
      <WorkNavoMark />
      <WorkNavoWordmark />
    </Link>
  );
}
