interface SkeletonProps {
  className?: string;
  delay?: number;
}

export function Skeleton({ className = "", delay }: SkeletonProps) {
  const hasBg = className.includes('bg-');
  const baseClasses = `rounded animate-pulse ${hasBg ? '' : 'bg-line/30'}`;
  const style = delay ? { animationDelay: `${delay}ms` } : undefined;

  return <div className={`${baseClasses} ${className}`} style={style} />;
}
