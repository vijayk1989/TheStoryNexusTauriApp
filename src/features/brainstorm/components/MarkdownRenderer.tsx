import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onDelete?: () => void;
  onEdit?: () => void;
  showDelete?: boolean;
}

// Define our own CodeComponentProps interface
interface CodeComponentProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
}

export default function MarkdownRenderer({
  content,
  className,
  onDelete,
  onEdit,
  showDelete,
}: MarkdownRendererProps) {
  if (!content) {
    return null;
  }

  return (
    <div className="relative group">
      {(showDelete && (onDelete || onEdit)) && (
        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 flex gap-1 items-center transition-opacity">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
            </Button>
          )}
          {showDelete && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      <div className={cn("prose prose-sm max-w-none", className)}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeSanitize]}
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            code: ({
              node,
              inline,
              className,
              children,
              ...props
            }: CodeComponentProps) => {
              const match = /language-(\w+)/.exec(className || "");
              return !inline ? (
                <pre className="overflow-x-auto p-2 bg-muted rounded text-xs whitespace-pre-wrap break-all">
                  <code
                    className={match ? `language-${match[1]}` : ""}
                    {...props}
                  >
                    {children}
                  </code>
                </pre>
              ) : (
                <code
                  className="bg-muted px-1 py-0.5 rounded text-xs"
                  {...props}
                >
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
    </div>
  );
}
