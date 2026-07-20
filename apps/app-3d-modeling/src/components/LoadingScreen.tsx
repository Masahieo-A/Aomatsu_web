"use client";

interface LoadingScreenProps {
  message?: string;
  className?: string;
}

export function LoadingScreen({ message = "部屋を読み込んでいます...", className }: LoadingScreenProps) {
  return (
    <div
      className={
        className
          ? `flex flex-col items-center justify-center gap-4 text-white ${className}`
          : "absolute inset-0 flex flex-col items-center justify-center gap-4 text-[#6b645c]"
      }
      style={{ background: "#f8f7f4" }}
    >
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#d8f3dc] border-t-[#2d6a4f]" />
      <p>{message}</p>
    </div>
  );
}
