import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { POV_OPTIONS } from "@/features/chapters/utils/pov";

export function PovInfoPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          aria-label="Point of view descriptions"
        >
          <Info className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] max-w-sm" align="start">
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium">Point of View</h4>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Pick the narrative distance the prose should preserve.
            </p>
          </div>
          <div className="space-y-2">
            {POV_OPTIONS.map((option) => (
              <div key={option.value} className="space-y-0.5">
                <div className="text-xs font-medium">{option.label}</div>
                <p className="text-xs leading-5 text-muted-foreground">
                  {option.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
