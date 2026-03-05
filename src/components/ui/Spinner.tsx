interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
  colorClass?: string;
}

export function Spinner({ size = "md", label, className = "", colorClass = "border-line border-t-content" }: SpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-2",
    lg: "w-10 h-10 border-4"
  };

  const spinner = <div className={`${sizeClasses[size]} rounded-full ${colorClass} animate-spin ${!label ? className : ''}`} />;

  if (!label) {
    return spinner;
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      {spinner}
      <div className="text-content-3 text-sm tracking-wider uppercase font-medium">{label}</div>
    </div>
  );
}
