import React from "react";
import { cn } from "@/lib/utils";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
  className?: string;
}

const Loader: React.FC<LoaderProps> = ({
  size = "md",
  fullScreen = false,
  className,
}) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
  };

  const spinner = (
    <div
      className={cn(
        "inline-block animate-spin rounded-full border-solid border-primary border-r-transparent",
        sizeClasses[size],
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        {spinner}
      </div>
    );
  }

  return <div className="flex items-center justify-center p-3">{spinner}</div>;
};

export default Loader;
