import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = () => {
    setIsAnimating(true);
    setTheme(theme === "dark" ? "light" : "dark");
    
    // Reset animation state after animation completes
    setTimeout(() => setIsAnimating(false), 500);
  };

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      className="text-foreground hover:bg-accent relative overflow-hidden"
    >
      <div className="relative h-5 w-5">
        {theme === "dark" ? (
          <Sun 
            className={`h-5 w-5 absolute inset-0 text-amber-500 ${isAnimating ? 'animate-sun' : ''}`}
          />
        ) : (
          <Moon 
            className={`h-5 w-5 absolute inset-0 text-indigo-500 ${isAnimating ? 'animate-moon' : ''}`}
          />
        )}
      </div>
      <span className="sr-only">Temayı Değiştir</span>
    </Button>
  );
}
