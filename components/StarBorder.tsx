import React from "react";

type StarBorderProps<T extends React.ElementType> =
  React.ComponentPropsWithoutRef<T> & {
    as?: T;
    className?: string;
    children?: React.ReactNode;
    color?: string;
    speed?: React.CSSProperties['animationDuration'];
    thickness?: number;
  }

const StarBorder = <T extends React.ElementType = "button">({
  as,
  className = "",
  color = "white",
  speed = "6s",
  thickness = 1,
  children,
  ...rest
}: StarBorderProps<T>) => {
  const Component = as || "button";

  // Use purple for light mode, cyan for dark mode
  const effectiveColor = color === "cyan" ? "rgb(147, 51, 234)" : color; // purple-600

  return (
    <Component 
      className={`relative inline-block overflow-hidden rounded-[20px] ${className}`} 
      {...(rest as any)}
      style={{
        padding: `${thickness}px 0`,
        ...(rest as any).style,
      }}
    >
      <div
        className="absolute w-[300%] h-[50%] opacity-70 bottom-[-11px] right-[-250%] rounded-full animate-star-movement-bottom z-0"
        style={{
          background: `radial-gradient(circle, ${effectiveColor}, transparent 10%)`,
          animationDuration: speed,
        }}
      ></div>
      <div
        className="absolute w-[300%] h-[50%] opacity-70 top-[-10px] left-[-250%] rounded-full animate-star-movement-top z-0"
        style={{
          background: `radial-gradient(circle, ${effectiveColor}, transparent 10%)`,
          animationDuration: speed,
        }}
      ></div>
      <div className="relative z-10 bg-gradient-to-b from-gray-900 to-black dark:from-gray-800 dark:to-gray-900 border border-gray-700 dark:border-gray-600 text-white text-center text-[16px] py-[16px] px-[26px] rounded-[20px] shadow-lg">
        {children}
      </div>
    </Component>
  );
};

export default StarBorder;
