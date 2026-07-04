import { useEffect, useRef } from "react";
import Lottie from "lottie-react";
import { useReducedMotion } from "framer-motion";

/**
 * Brand-recolored Lottie player.
 * Respects prefers-reduced-motion by freezing on a meaningful frame
 * (70% through) instead of playing.
 */
export default function LottieFx({
  animationData,
  loop = true,
  size = 160,
  className = "",
  ...rest
}) {
  const reduce = useReducedMotion();
  const ref = useRef(null);

  useEffect(() => {
    if (reduce && ref.current) {
      const total = ref.current.getDuration(true) || 0;
      ref.current.goToAndStop(Math.floor(total * 0.7), true);
    }
  }, [reduce]);

  return (
    <Lottie
      lottieRef={ref}
      animationData={animationData}
      loop={reduce ? false : loop}
      autoplay={!reduce}
      className={className}
      style={{ width: size, height: size }}
      aria-hidden="true"
      {...rest}
    />
  );
}
