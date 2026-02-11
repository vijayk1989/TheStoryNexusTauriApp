/**
 * SceneBeat header bar — collapse toggle, title, stop button, POV popover,
 * matched tags button, and delete button.
 */
import {
    ChevronRight,
    User,
    Check,
    Eye,
    Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useSBStore } from '@/features/scenebeats/stores/useSceneBeatInstanceStore';
import type { LorebookEntry } from '@/types/story';
import { useMemo } from 'react';
import { useLorebookStore } from '@/features/lorebook/stores/useLorebookStore';
import { sceneBeatService } from '@/features/scenebeats/services/sceneBeatService';
import { toast } from 'react-toastify';

interface SceneBeatHeaderProps {
    streaming: boolean;
    onAbort: () => void;
    onDelete: () => Promise<void>;
}

export function SceneBeatHeader({ streaming, onAbort, onDelete }: SceneBeatHeaderProps) {
    const collapsed = useSBStore((s) => s.collapsed);
    const povType = useSBStore((s) => s.povType);
    const povCharacter = useSBStore((s) => s.povCharacter);
    const tempPovType = useSBStore((s) => s.tempPovType);
    const tempPovCharacter = useSBStore((s) => s.tempPovCharacter);
    const showPovPopover = useSBStore((s) => s.showPovPopover);
    const sceneBeatId = useSBStore((s) => s.sceneBeatId);
    const showMatchedEntries = useSBStore((s) => s.showMatchedEntries);
    const set = useSBStore((s) => s.set);
    const handlePovTypeChange = useSBStore((s) => s.handlePovTypeChange);
    const handleOpenPovPopover = useSBStore((s) => s.handleOpenPovPopover);

    const { entries } = useLorebookStore();
    const characterEntries = useMemo(
        () => entries.filter((e: LorebookEntry) => e.category === 'character'),
        [entries]
    );

    const handleSavePov = async () => {
        set({ povType: tempPovType, povCharacter: tempPovCharacter, showPovPopover: false });
        if (sceneBeatId) {
            try {
                await sceneBeatService.updateSceneBeat(sceneBeatId, {
                    povType: tempPovType,
                    povCharacter: tempPovCharacter,
                });
            } catch (error) {
                console.error('Error saving POV settings:', error);
            }
        }
        toast.success('POV settings saved');
    };

    return (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2">
            <div className="flex items-center gap-2 md:gap-4">
                <button
                    onClick={() => set({ collapsed: !collapsed })}
                    className="flex items-center justify-center hover:bg-accent/50 rounded-md w-6 h-6"
                >
                    <ChevronRight
                        className={cn('h-4 w-4 transition-transform', !collapsed && 'rotate-90')}
                    />
                </button>
                <span className="font-medium text-sm md:text-base">Scene Beat</span>
            </div>
            <div className="flex flex-wrap items-center gap-1 md:gap-2">
                {streaming && (
                    <Button
                        variant="default"
                        size="sm"
                        onClick={onAbort}
                        className="h-7 md:h-8 text-xs md:text-sm"
                    >
                        Stop
                    </Button>
                )}

                {/* POV Popover */}
                <Popover open={showPovPopover} onOpenChange={handleOpenPovPopover}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 md:h-8 text-xs md:text-sm px-2">
                            <User className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                            <span className="hidden sm:inline">POV: </span>
                            <span className="truncate max-w-[60px] sm:max-w-none">
                                {povType === 'Third Person Omniscient'
                                    ? 'Omni'
                                    : povCharacter || 'Select'}
                            </span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80 max-w-sm">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">Point of View</h4>
                                <p className="text-sm text-muted-foreground">
                                    Set the POV for this scene beat
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="povType">POV Type</Label>
                                <Select
                                    value={tempPovType}
                                    onValueChange={(value) => handlePovTypeChange(value as any)}
                                >
                                    <SelectTrigger id="povType">
                                        <SelectValue placeholder="Select POV type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="First Person">First Person</SelectItem>
                                        <SelectItem value="Third Person Limited">Third Person Limited</SelectItem>
                                        <SelectItem value="Third Person Omniscient">Third Person Omniscient</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {tempPovType !== 'Third Person Omniscient' && (
                                <div className="grid gap-2">
                                    <Label htmlFor="povCharacter">POV Character</Label>
                                    <Select value={tempPovCharacter} onValueChange={(v) => set({ tempPovCharacter: v })}>
                                        <SelectTrigger id="povCharacter">
                                            <SelectValue placeholder="Select character" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {characterEntries.length === 0 ? (
                                                <SelectItem value="none" disabled>
                                                    No characters available
                                                </SelectItem>
                                            ) : (
                                                characterEntries.map((c) => (
                                                    <SelectItem key={c.id} value={c.name}>
                                                        {c.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <Button className="w-full mt-2" onClick={handleSavePov}>
                                <Check className="h-4 w-4 mr-2" />
                                Save POV Settings
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Matched Tags button */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 md:h-8 text-xs md:text-sm px-2"
                    onClick={() => set({ showMatchedEntries: !showMatchedEntries })}
                >
                    <Eye className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Matched Tags</span>
                    <span className="sm:hidden">Tags</span>
                </Button>

                {/* Delete button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onDelete}
                    className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground hover:text-destructive"
                >
                    <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
            </div>
        </div>
    );
}
