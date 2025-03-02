import { ChevronDown } from "lucide-react";
import { Button } from "../../../components/ui/button";

export function StoryOutline() {
    return (
        <div className="h-full flex flex-col">
            <div className="p-4 space-y-4">
                {/* Scene Summary */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium">Scene Summary</h3>
                        <Button variant="ghost" size="icon">
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        The protagonist discovers an ancient artifact in the attic...
                    </p>
                </div>

                {/* Key Points */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium">Key Points</h3>
                        <Button variant="ghost" size="icon">
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </div>
                    <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                        <li>Introduction of the magical artifact</li>
                        <li>First hint of the main conflict</li>
                        <li>Character's initial reaction</li>
                    </ul>
                </div>

                {/* Scene Goals */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium">Scene Goals</h3>
                        <Button variant="ghost" size="icon">
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </div>
                    <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                        <li>Establish the mysterious nature of the artifact</li>
                        <li>Show protagonist's curiosity</li>
                        <li>Hint at future complications</li>
                    </ul>
                </div>
            </div>
        </div>
    );
} 