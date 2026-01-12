import { useState } from "react";
import { Link } from "react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ExternalLink } from "lucide-react";
import BasicsGuide from "../components/BasicsGuide";
import AdvancedGuide from "../components/AdvancedGuide";
import LorebookGuide from "../components/LorebookGuide";
import PromptGuide from "../components/PromptGuide";
import BrainstormGuide from "../components/BrainstormGuide";

export default function GuidePage() {
    const [activeTab, setActiveTab] = useState("basics");

    return (
        <div className="container mx-auto py-4 md:py-8 px-4 max-w-5xl">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-6 md:mb-8">
                <Link to="/">
                    <Button variant="ghost" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Home
                    </Button>
                </Link>
                <h1 className="text-2xl md:text-3xl font-bold sm:ml-4">The Story Nexus Guide</h1>
            </div>

            <Card>
                <CardHeader className="pb-4">
                    <CardTitle>Welcome to The Story Nexus</CardTitle>
                    <CardDescription>
                        Your comprehensive guide to using this AI-powered story writing application
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="basics" value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                            <TabsList className="inline-flex w-max md:grid md:grid-cols-5 md:w-full mb-6 md:mb-8">
                                <TabsTrigger value="basics" className="whitespace-nowrap">Basics</TabsTrigger>
                                <TabsTrigger value="advanced" className="whitespace-nowrap">Advanced</TabsTrigger>
                                <TabsTrigger value="lorebook" className="whitespace-nowrap">Lorebook</TabsTrigger>
                                <TabsTrigger value="prompts" className="whitespace-nowrap">Prompts</TabsTrigger>
                                <TabsTrigger value="brainstorm" className="whitespace-nowrap">Brainstorm</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="basics" className="space-y-4">
                            <BasicsGuide />
                        </TabsContent>

                        <TabsContent value="advanced" className="space-y-4">
                            <AdvancedGuide />
                        </TabsContent>

                        <TabsContent value="lorebook" className="space-y-4">
                            <LorebookGuide />
                        </TabsContent>

                        <TabsContent value="prompts" className="space-y-4">
                            <PromptGuide />
                        </TabsContent>

                        <TabsContent value="brainstorm" className="space-y-4">
                            <BrainstormGuide />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
} 