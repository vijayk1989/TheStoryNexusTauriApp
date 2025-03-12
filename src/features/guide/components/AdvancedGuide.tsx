import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdvancedGuide() {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold mb-4">Advanced Features Guide</h2>
                <p className="text-muted-foreground mb-6">
                    Learn about the advanced features of The Story Nexus to take your writing to the next level.
                </p>
            </div>

            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Coming Soon</AlertTitle>
                <AlertDescription>
                    The advanced features guide is currently under development. Check back soon for detailed information on advanced writing techniques, AI customization, and more.
                </AlertDescription>
            </Alert>

            <div className="space-y-4">
                <h3 className="text-xl font-semibold">Topics to be covered:</h3>
                <ul className="list-disc list-inside space-y-2 ml-4 text-muted-foreground">
                    <li>Advanced editor features and keyboard shortcuts</li>
                    <li>Customizing the writing experience</li>
                    <li>Managing multiple stories and chapters effectively</li>
                    <li>Organizing your writing workflow</li>
                    <li>Advanced AI generation techniques</li>
                    <li>Exporting and sharing your stories</li>
                </ul>
            </div>
        </div>
    );
} 