import dynamic from "next/dynamic";
import type { CSSProperties, ComponentType } from "react";
import { cn } from "@/lib/utils";
import animationData from "../../../public/loading.json";

// Minimal view of lottie-react v3's <Lottie> — just the props we pass. Cast on
// import so we don't depend on its complex generic component type.
type LottieBoxProps = {
  src: unknown;
  loop?: boolean;
  autoplay?: boolean;
  style?: CSSProperties;
};

// lottie-react touches the DOM, so load it client-side only. Loading states are
// user-triggered (client-side), so rendering nothing during SSR is fine.
const Lottie = dynamic<LottieBoxProps>(
  () =>
    import("lottie-react").then(
      (m) => m.Lottie as unknown as ComponentType<LottieBoxProps>,
    ),
  { ssr: false },
);

// Source artwork is 60×48 — keep that ratio so the dots never distort.
const RATIO = 60 / 48;

interface LoaderProps {
  className?: string;
  /** Height in pixels; width scales with the artwork ratio. */
  size?: number;
}

// Site-wide loading indicator, rendered from public/loading.json.
export function Loader({ className, size = 24 }: LoaderProps) {
  const height = size;
  const width = Math.round(size * RATIO);
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("inline-flex items-center justify-center", className)}
      style={{ width, height }}
    >
      <Lottie src={animationData} loop autoplay style={{ width, height }} />
    </span>
  );
}

// Centered block loader for page/section level loading placeholders.
export function PageLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-12", className)}>
      <Loader size={40} />
    </div>
  );
}
