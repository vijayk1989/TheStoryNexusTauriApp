import { ChevronDown } from "lucide-react";
import { Button } from "../../../components/ui/button";

export function WorldDataList() {
    return (
        <div className="p-4 space-y-4">
            {/* Characters Section */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h3 className="font-medium">Characters</h3>
                    <Button variant="ghost" size="icon">
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                </div>
                <div className="pl-4 space-y-1">
                    <div className="text-sm py-1 px-2 hover:bg-accent rounded-md cursor-pointer">
                        Hermione
                    </div>
                    {/* Add more characters */}
                </div>
            </div>

            {/* Locations Section */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h3 className="font-medium">Locations</h3>
                    <Button variant="ghost" size="icon">
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                </div>
                <div className="pl-4 space-y-1">
                    <div className="text-sm py-1 px-2 hover:bg-accent rounded-md cursor-pointer">
                        Hogwarts
                    </div>
                    {/* Add more locations */}
                </div>
            </div>
        </div>
    );
} 