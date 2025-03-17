import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

// Define our own CodeComponentProps interface
interface CodeComponentProps {
    node?: any;
    inline?: boolean;
    className?: string;
    children: React.ReactNode;
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
    if (!content) {
        return null;
    }

    return (
        <div className={cn("prose prose-sm max-w-none", className)}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
                components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    code: ({ node, inline, className, children, ...props }: CodeComponentProps) => {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline ? (
                            <pre className="overflow-x-auto p-2 bg-muted rounded text-xs whitespace-pre-wrap break-all">
                                <code className={match ? `language-${match[1]}` : ''} {...props}>
                                    {children}
                                </code>
                            </pre>
                        ) : (
                            <code className="bg-muted px-1 py-0.5 rounded text-xs" {...props}>
                                {children}
                            </code>
                        );
                    },
                    pre: ({ children }) => (
                        <pre className="overflow-x-auto p-0 bg-transparent whitespace-pre-wrap break-all">
                            {children}
                        </pre>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
} 