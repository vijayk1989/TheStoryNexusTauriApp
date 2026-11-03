import { AlertCircle, CheckCircle2, CircleStop, Loader2 } from 'lucide-react';
import { useBrainstormTaskStore } from '../stores/useBrainstormTaskStore';

export function BrainstormTaskStatus({ chatId }: { chatId: string }) {
    const status = useBrainstormTaskStore(state => state.tasks[chatId]?.status);
    if (!status) return null;
    const labels = { running: 'Running', completed: 'Completed', stopped: 'Stopped', failed: 'Failed' };
    const Icon = { running: Loader2, completed: CheckCircle2, stopped: CircleStop, failed: AlertCircle }[status];
    return (
        <span role="status" aria-label={`Generation ${status}`} className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Icon aria-hidden="true" className={`h-3 w-3 ${status === 'running' ? 'animate-spin' : ''}`} />
            {labels[status]}
        </span>
    );
}
