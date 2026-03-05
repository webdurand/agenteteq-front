interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  const hasBg = className.includes('bg-');
  const baseClasses = `rounded animate-pulse ${hasBg ? '' : 'bg-line/30'}`;
  
  return <div className={`${baseClasses} ${className}`} />;
}
