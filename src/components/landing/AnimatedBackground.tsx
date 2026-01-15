import { useScrollPosition, useMouseParallax } from "@/hooks/useParallax";

// Animated Gradient Background Component
export const AnimatedGradientBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Main animated gradient */}
      <div 
        className="absolute inset-0 opacity-30 dark:opacity-20"
        style={{
          background: `
            linear-gradient(
              -45deg,
              hsl(var(--primary) / 0.3),
              hsl(174 60% 50% / 0.2),
              hsl(250 60% 60% / 0.3),
              hsl(var(--primary) / 0.2),
              hsl(30 80% 55% / 0.2)
            )
          `,
          backgroundSize: '400% 400%',
          animation: 'gradient-shift 15s ease infinite',
        }}
      />
      
      {/* Mesh gradient overlay */}
      <div 
        className="absolute inset-0 opacity-20 dark:opacity-10"
        style={{
          background: `
            radial-gradient(circle at 20% 80%, hsl(var(--primary) / 0.4) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, hsl(250 60% 60% / 0.3) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, hsl(174 60% 50% / 0.3) 0%, transparent 40%)
          `,
        }}
      />
      
      {/* Noise texture overlay for depth */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

// Animated Blob Component
export const AnimatedBlob = ({ 
  className = "",
  color = "primary",
  size = "md",
  delay = 0
}: {
  className?: string;
  color?: "primary" | "violet" | "cyan" | "amber" | "emerald";
  size?: "sm" | "md" | "lg" | "xl";
  delay?: number;
}) => {
  const colorMap = {
    primary: "bg-primary/20 dark:bg-primary/10",
    violet: "bg-violet-500/20 dark:bg-violet-500/10",
    cyan: "bg-cyan-500/20 dark:bg-cyan-500/10",
    amber: "bg-amber-500/20 dark:bg-amber-500/10",
    emerald: "bg-emerald-500/20 dark:bg-emerald-500/10",
  };
  
  const sizeMap = {
    sm: "w-32 h-32",
    md: "w-48 h-48",
    lg: "w-64 h-64",
    xl: "w-96 h-96",
  };

  return (
    <div 
      className={`absolute ${sizeMap[size]} ${colorMap[color]} rounded-full blur-3xl animate-blob ${className}`}
      style={{ animationDelay: `${delay}s` }}
    />
  );
};

// Morphing Blob Component
export const MorphingBlob = ({
  className = "",
  color = "primary"
}: {
  className?: string;
  color?: "primary" | "violet" | "cyan";
}) => {
  const colorMap = {
    primary: "from-primary/30 to-primary/10",
    violet: "from-violet-500/30 to-purple-500/10",
    cyan: "from-cyan-500/30 to-teal-500/10",
  };

  return (
    <div 
      className={`absolute w-72 h-72 bg-gradient-to-br ${colorMap[color]} blur-3xl animate-morph ${className}`}
    />
  );
};

// Glowing Orb Component
export const GlowingOrb = ({
  className = "",
  color = "primary",
  size = "md"
}: {
  className?: string;
  color?: "primary" | "violet" | "amber";
  size?: "sm" | "md" | "lg";
}) => {
  const { x, y } = useMouseParallax(0.02);
  
  const colorMap = {
    primary: "bg-gradient-to-br from-primary to-primary/50",
    violet: "bg-gradient-to-br from-violet-500 to-purple-500/50",
    amber: "bg-gradient-to-br from-amber-500 to-orange-500/50",
  };
  
  const sizeMap = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div 
      className={`absolute ${sizeMap[size]} ${colorMap[color]} rounded-full animate-glow-pulse shadow-lg ${className}`}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        boxShadow: `0 0 20px currentColor`,
      }}
    />
  );
};

// Parallax Background Element
export const ParallaxElement = ({ 
  className = "",
  speed = 0.5,
  children
}: { 
  className?: string;
  speed?: number;
  children?: React.ReactNode;
}) => {
  const { scrollY } = useScrollPosition();
  
  return (
    <div 
      className={className}
      style={{ 
        transform: `translateY(${scrollY * speed}px)`,
        willChange: 'transform'
      }}
    >
      {children}
    </div>
  );
};

// Mouse-following parallax element
export const MouseParallaxElement = ({
  className = "",
  sensitivity = 0.02,
  children
}: {
  className?: string;
  sensitivity?: number;
  children?: React.ReactNode;
}) => {
  const { x, y } = useMouseParallax(sensitivity);
  
  return (
    <div
      className={className}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        willChange: 'transform',
        transition: 'transform 0.3s ease-out'
      }}
    >
      {children}
    </div>
  );
};

// Grid Pattern Overlay
export const GridPattern = ({ className = "" }: { className?: string }) => {
  return (
    <div 
      className={`absolute inset-0 opacity-[0.02] dark:opacity-[0.03] ${className}`}
      style={{
        backgroundImage: `
          linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
          linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
      }}
    />
  );
};

// Radial Gradient Spotlight
export const Spotlight = ({ className = "" }: { className?: string }) => {
  const { x, y } = useMouseParallax(0.1);
  
  return (
    <div 
      className={`absolute w-[500px] h-[500px] opacity-20 pointer-events-none ${className}`}
      style={{
        background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
        transform: `translate(${x * 2}px, ${y * 2}px)`,
        transition: 'transform 0.5s ease-out',
      }}
    />
  );
};
