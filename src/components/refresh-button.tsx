import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
  onRefresh: () => void;
  isLoading?: boolean;
  lastUpdated?: Date | null;
  className?: string;
  showTime?: boolean;
}

export function RefreshButton({
  onRefresh,
  isLoading = false,
  lastUpdated,
  className,
  showTime = true,
}: RefreshButtonProps) {
  const formatLastUpdated = () => {
    if (!lastUpdated) return "";

    const now = new Date();
    const diff = now.getTime() - lastUpdated.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (seconds < 60) return "Agora mesmo";
    if (minutes < 60) return `${minutes}min atrás`;

    return lastUpdated.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showTime && lastUpdated && (
        <span className="text-xs text-muted-foreground">
          Atualizado: {formatLastUpdated()}
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isLoading}
        className="gap-1"
      >
        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        Atualizar
      </Button>
    </div>
  );
}
