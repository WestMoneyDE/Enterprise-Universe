"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIMIZED IMAGE - Next.js Image with loading states and error handling
// ═══════════════════════════════════════════════════════════════════════════════

interface OptimizedImageProps extends Omit<React.ComponentProps<typeof Image>, "onError" | "onLoad"> {
  fallbackSrc?: string;
  showSkeleton?: boolean;
  aspectRatio?: "square" | "video" | "portrait" | "auto";
  containerClassName?: string;
}

export function OptimizedImage({
  src,
  alt,
  fallbackSrc = "/placeholder.svg",
  showSkeleton = true,
  aspectRatio = "auto",
  containerClassName,
  className,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [imageSrc, setImageSrc] = React.useState(src);

  React.useEffect(() => {
    setImageSrc(src);
    setError(false);
    setIsLoading(true);
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setError(true);
    setIsLoading(false);
    if (fallbackSrc && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
    }
  };

  const aspectRatioClasses = {
    square: "aspect-square",
    video: "aspect-video",
    portrait: "aspect-[3/4]",
    auto: "",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        aspectRatioClasses[aspectRatio],
        containerClassName
      )}
    >
      {showSkeleton && isLoading && (
        <Skeleton className="absolute inset-0 z-10" />
      )}
      <Image
        src={imageSrc}
        alt={alt}
        className={cn(
          "object-cover transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </div>
  );
}

// Avatar with optimized loading
interface AvatarImageProps {
  src?: string | null;
  alt: string;
  fallback?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function AvatarImage({
  src,
  alt,
  fallback,
  size = "md",
  className,
}: AvatarImageProps) {
  const [error, setError] = React.useState(false);

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  const initials = fallback || getInitials(alt);

  if (!src || error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-neon-cyan/20 font-medium text-neon-cyan",
          sizeClasses[size],
          className
        )}
      >
        {initials}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-full", sizeClasses[size], className)}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Background image with blur placeholder
interface BackgroundImageProps {
  src: string;
  alt?: string;
  blurDataURL?: string;
  overlay?: boolean;
  overlayColor?: string;
  children?: React.ReactNode;
  className?: string;
}

export function BackgroundImage({
  src,
  alt = "",
  blurDataURL,
  overlay = true,
  overlayColor = "rgba(10, 10, 15, 0.8)",
  children,
  className,
}: BackgroundImageProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        placeholder={blurDataURL ? "blur" : "empty"}
        blurDataURL={blurDataURL}
      />
      {overlay && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: overlayColor }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
