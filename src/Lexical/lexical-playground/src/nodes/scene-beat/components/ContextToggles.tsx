import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";

interface ContextTogglesProps {
  useMatchedChapter: boolean;
  useMatchedSceneBeat: boolean;
  useCustomContext: boolean;
  onMatchedChapterChange: (enabled: boolean) => void;
  onMatchedSceneBeatChange: (enabled: boolean) => void;
  onCustomContextChange: (enabled: boolean) => void;
  children?: React.ReactNode;
}

/**
 * Collapsible section with three context toggle switches.
 * Can optionally render children (e.g., custom context selection UI) when expanded.
 */
export const ContextToggles = ({
  useMatchedChapter,
  useMatchedSceneBeat,
  useCustomContext,
  onMatchedChapterChange,
  onMatchedSceneBeatChange,
  onCustomContextChange,
  children,
}: ContextTogglesProps): JSX.Element => {
  const [showContext, setShowContext] = useState(false);

  return (
    <div className="px-4 pb-2">
      <Collapsible open={showContext} onOpenChange={setShowContext}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center justify-between p-1 h-auto"
          >
            {showContext ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="font-medium">Context</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 mb-4">
            {/* Matched Chapter Tags Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Matched Chapter Tags</div>
                <div className="text-sm text-muted-foreground">
                  Include entries matched from the entire chapter
                </div>
              </div>
              <Switch
                checked={useMatchedChapter}
                onCheckedChange={onMatchedChapterChange}
              />
            </div>

            {/* Matched Scene Beat Tags Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Matched Scene Beat Tags</div>
                <div className="text-sm text-muted-foreground">
                  Include entries matched from this scene beat
                </div>
              </div>
              <Switch
                checked={useMatchedSceneBeat}
                onCheckedChange={onMatchedSceneBeatChange}
              />
            </div>

            {/* Custom Context Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Custom Context Selection</div>
                <div className="text-sm text-muted-foreground">
                  Manually select additional lorebook entries
                </div>
              </div>
              <Switch
                checked={useCustomContext}
                onCheckedChange={onCustomContextChange}
              />
            </div>
          </div>

          {/* Render children (custom context selection UI) if provided */}
          {children}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
