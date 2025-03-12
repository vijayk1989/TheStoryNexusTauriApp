import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function BrainstormGuide() {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold mb-4">Brainstorm Guide</h2>
                <p className="text-muted-foreground mb-6">
                    Learn how to use the brainstorming features to develop ideas and overcome writer's block.
                </p>
            </div>

            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Coming Soon</AlertTitle>
                <AlertDescription>
                    The Brainstorm guide is currently under development. Check back soon for detailed information on using AI to help develop your story ideas.
                </AlertDescription>
            </Alert>

            <div className="space-y-4">
                <h3 className="text-xl font-semibold">Topics to be covered:</h3>
                <ul className="list-disc list-inside space-y-2 ml-4 text-muted-foreground">
                    <li>Using AI for story ideation</li>
                    <li>Character development brainstorming</li>
                    <li>Plot and narrative structure assistance</li>
                    <li>Overcoming writer's block</li>
                    <li>Refining and expanding story concepts</li>
                    <li>Collaborative brainstorming techniques</li>
                </ul>
            </div>
        </div>
    );
} 