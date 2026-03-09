import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Show only the square icon mark */
  iconOnly?: boolean;
  /** Kept for backward compatibility — unused now that we have a real logo */
  showTagline?: boolean;
}

const wordmarkSizes = {
  sm: { width: 78,  height: 26 },
  md: { width: 96,  height: 32 },
  lg: { width: 115, height: 38 },
};

const taglineSize = {
  sm: "text-[7px]",
  md: "text-[8px]",
  lg: "text-[9px]",
};

const iconMarkSizes = {
  sm: { width: 28, height: 28 },
  md: { width: 34, height: 34 },
  lg: { width: 42, height: 42 },
};

export function Logo({ className, size = "md", iconOnly = false }: LogoProps) {
  if (iconOnly) {
    const s = iconMarkSizes[size];
    return (
      <Link href="/" className={cn("inline-flex items-center shrink-0", className)}>
        <Image
          src="/logo-icon.png"
          alt="GCS"
          width={s.width}
          height={s.height}
          className="object-contain"
          priority
        />
      </Link>
    );
  }

  const s = wordmarkSizes[size];
  return (
    <Link href="/" className={cn("inline-flex flex-col shrink-0", className)}>
      <Image
        src="/logo.png"
        alt="GCS — General Computing Solutions"
        width={s.width}
        height={s.height}
        className="object-contain"
        priority
      />
      <span
        className={cn("font-semibold tracking-wide leading-none -mt-0.5", taglineSize[size])}
        style={{ color: "#1565C0" }}
      >
        General Computing Solutions
      </span>
    </Link>
  );
}
