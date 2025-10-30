import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { User, Check } from "lucide-react";
import type { LorebookEntry } from "@/types/story";

export type POVType =
  | "First Person"
  | "Third Person Limited"
  | "Third Person Omniscient";

interface POVSettingsPopoverProps {
  povType: POVType | undefined;
  povCharacter: string | undefined;
  characterEntries: LorebookEntry[];
  onSave: (povType: POVType | undefined, povCharacter: string | undefined) => void;
}

/**
 * Popover for selecting POV type and character.
 * Uses controlled form state internally to handle temporary editing.
 */
export const POVSettingsPopover = ({
  povType,
  povCharacter,
  characterEntries,
  onSave,
}: POVSettingsPopoverProps): JSX.Element => {
  const [open, setOpen] = useState(false);
  const [tempPovType, setTempPovType] = useState<POVType | undefined>(povType);
  const [tempPovCharacter, setTempPovCharacter] = useState<string | undefined>(
    povCharacter
  );

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      // Reset temp values when opening
      setTempPovType(povType);
      setTempPovCharacter(povCharacter);
    }
    setOpen(isOpen);
  };

  const handlePovTypeChange = (value: POVType) => {
    setTempPovType(value);
    // If switching to omniscient, clear character
    if (value === "Third Person Omniscient") {
      setTempPovCharacter(undefined);
    }
  };

  const handleSave = () => {
    onSave(tempPovType, tempPovCharacter);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8">
          <User className="h-4 w-4 mr-2" />
          <span>
            POV:{" "}
            {povType === "Third Person Omniscient"
              ? "Omniscient"
              : povCharacter || "Select"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
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
              onValueChange={handlePovTypeChange}
            >
              <SelectTrigger id="povType">
                <SelectValue placeholder="Select POV type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="First Person">First Person</SelectItem>
                <SelectItem value="Third Person Limited">
                  Third Person Limited
                </SelectItem>
                <SelectItem value="Third Person Omniscient">
                  Third Person Omniscient
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {tempPovType !== "Third Person Omniscient" && (
            <div className="grid gap-2">
              <Label htmlFor="povCharacter">POV Character</Label>
              <Select
                value={tempPovCharacter}
                onValueChange={setTempPovCharacter}
              >
                <SelectTrigger id="povCharacter">
                  <SelectValue placeholder="Select character" />
                </SelectTrigger>
                <SelectContent>
                  {characterEntries.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No characters available
                    </SelectItem>
                  ) : (
                    characterEntries.map((character) => (
                      <SelectItem key={character.id} value={character.name}>
                        {character.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button className="w-full mt-2" onClick={handleSave}>
            <Check className="h-4 w-4 mr-2" />
            Save POV Settings
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
