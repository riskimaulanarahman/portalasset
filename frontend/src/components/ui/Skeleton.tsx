import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div className={cn('skeleton', className)} />
);

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className,
}) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')}
      />
    ))}
  </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('card p-6 space-y-4', className)}>
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-2 w-1/4" />
      </div>
    </div>
    <Skeleton className="h-8 w-1/2" />
    <Skeleton className="h-2 w-full" />
    <Skeleton className="h-2 w-4/5" />
  </div>
);

export const SkeletonRow: React.FC<{ cols?: number }> = ({ cols = 5 }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-5 py-4">
        <Skeleton className="h-3 w-full" />
      </td>
    ))}
  </tr>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 6,
  cols = 5,
}) => (
  <div className="card overflow-hidden">
    {/* header */}
    <div className="px-5 py-4 border-b border-forest-50 flex gap-4 items-center">
      <Skeleton className="h-9 w-64" />
      <div className="ml-auto">
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
    <table className="w-full">
      <thead>
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} className="px-5 py-3">
              <Skeleton className="h-2.5 w-20" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} cols={cols} />
        ))}
      </tbody>
    </table>
  </div>
);

export default Skeleton;
