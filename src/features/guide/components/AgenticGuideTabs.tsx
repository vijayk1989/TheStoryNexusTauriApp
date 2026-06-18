import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdvancedGuide from "./AdvancedGuide";
import AgenticGuide from "./AgenticGuide";

export default function AgenticGuideTabs() {
    return (
        <Tabs defaultValue="basic" className="w-full">
            <div className="overflow-x-auto">
                <TabsList className="mb-4 inline-flex w-max">
                    <TabsTrigger value="basic">Basic</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>
            </div>
            <TabsContent value="basic" className="space-y-4">
                <AgenticGuide />
            </TabsContent>
            <TabsContent value="advanced" className="space-y-4">
                <AdvancedGuide />
            </TabsContent>
        </Tabs>
    );
}
