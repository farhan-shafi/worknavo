import type { HTMLAttributes } from 'react';

import { apiAssetUrl } from '../../lib/api-client';
import { cn } from '../../lib/utils';

interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'size-8 text-[10px]',
  md: 'size-10 text-xs',
  lg: 'size-12 text-sm',
};

export function Avatar({
  className,
  name,
  size = 'md',
  src,
  ...props
}: AvatarProps) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const imageSrc = src?.startsWith('/') ? apiAssetUrl(src) : src;

  return (
    <span
      className={cn(
        'bg-primary-soft/45 text-primary grid shrink-0 place-items-center overflow-hidden rounded-full font-extrabold',
        sizes[size],
        className,
      )}
      {...props}
    >
      {imageSrc ? (
        <img alt={name} className="size-full object-cover" src={imageSrc} />
      ) : (
        initials
      )}
    </span>
  );
}
