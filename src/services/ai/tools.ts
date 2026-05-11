export const webSearchToolSchema = {
    type: "function",
    function: {
        name: "search_web",
        description: "Search the web for up-to-date information, facts, or references.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The search query to execute"
                }
            },
            required: ["query"]
        }
    }
};

export async function executeTavilySearch(query: string, apiKey: string): Promise<string> {
    if (!apiKey) {
        return JSON.stringify({ error: "Tavily API key not configured." });
    }

    try {
        const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                api_key: apiKey,
                query: query,
                search_depth: "basic",
                include_answer: true,
                max_results: 5
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Tavily search failed: ${response.status} ${errText}`);
        }

        const data = await response.json();
        
        // Return a condensed summary string
        if (data.answer) {
            return JSON.stringify({ answer: data.answer, results: data.results });
        }
        
        return JSON.stringify({ results: data.results });
    } catch (error) {
        console.error("Error executing Tavily search:", error);
        return JSON.stringify({ error: error instanceof Error ? error.message : String(error) });
    }
}
