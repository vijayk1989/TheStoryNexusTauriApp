/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { LexicalEditor } from 'lexical';
import * as React from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Minus, Plus } from "lucide-react"

import {
  MAX_ALLOWED_FONT_SIZE,
  MIN_ALLOWED_FONT_SIZE,
} from '../../context/ToolbarContext';
import { SHORTCUTS } from '../ShortcutsPlugin/shortcuts';
import {
  updateFontSizeInSelection,
} from './utils';

export function parseAllowedFontSize(input: string): string {
  const match = input.match(/^(\d+(?:\.\d+)?)px$/);
  if (match) {
    const n = Number(match[1]);
    if (n >= MIN_ALLOWED_FONT_SIZE && n <= MAX_ALLOWED_FONT_SIZE) {
      return input;
    }
  }
  return '';
}

export default function FontSize({
  selectionFontSize,
  disabled,
  editor,
}: {
  selectionFontSize: string;
  disabled: boolean;
  editor: LexicalEditor;
}) {
  const [inputValue, setInputValue] = React.useState<string>(selectionFontSize);
  const [inputChangeFlag, setInputChangeFlag] = React.useState<boolean>(false);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const inputValueNumber = Number(inputValue);

    if (e.key === 'Tab') {
      return;
    }
    if (['e', 'E', '+', '-'].includes(e.key) || isNaN(inputValueNumber)) {
      e.preventDefault();
      setInputValue('');
      return;
    }
    setInputChangeFlag(true);
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      updateFontSizeByInputValue(inputValueNumber);
    }
  };

  const handleInputBlur = () => {
    if (inputValue !== '' && inputChangeFlag) {
      const inputValueNumber = Number(inputValue);
      updateFontSizeByInputValue(inputValueNumber);
    }
  };

  const updateFontSizeByInputValue = (inputValueNumber: number) => {
    let updatedFontSize = inputValueNumber;
    if (inputValueNumber > MAX_ALLOWED_FONT_SIZE) {
      updatedFontSize = MAX_ALLOWED_FONT_SIZE;
    } else if (inputValueNumber < MIN_ALLOWED_FONT_SIZE) {
      updatedFontSize = MIN_ALLOWED_FONT_SIZE;
    }

    setInputValue(String(updatedFontSize));
    updateFontSizeInSelection(editor, String(updatedFontSize) + 'px', null);
    setInputChangeFlag(false);
  };

  const handleIncrement = () => {
    const currentSize = Number(inputValue);
    const newSize = Math.min(currentSize + 1, MAX_ALLOWED_FONT_SIZE);
    updateFontSizeByInputValue(newSize);
  };

  const handleDecrement = () => {
    const currentSize = Number(inputValue);
    const newSize = Math.max(currentSize - 1, MIN_ALLOWED_FONT_SIZE);
    updateFontSizeByInputValue(newSize);
  };

  React.useEffect(() => {
    setInputValue(selectionFontSize);
  }, [selectionFontSize]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        disabled={
          disabled ||
          (selectionFontSize !== '' &&
            Number(inputValue) <= MIN_ALLOWED_FONT_SIZE)
        }
        onClick={handleDecrement}
        className="h-8 w-8"
        aria-label="Decrease font size"
        title={`Decrease font size (${SHORTCUTS.DECREASE_FONT_SIZE})`}>
        <Minus className="h-4 w-4" />
      </Button>

      <Input
        type="number"
        title="Font size"
        value={inputValue}
        disabled={disabled}
        className="h-8 w-16 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        min={MIN_ALLOWED_FONT_SIZE}
        max={MAX_ALLOWED_FONT_SIZE}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyPress}
        onBlur={handleInputBlur}
      />

      <Button
        variant="ghost"
        size="icon"
        type="button"
        disabled={
          disabled ||
          (selectionFontSize !== '' &&
            Number(inputValue) >= MAX_ALLOWED_FONT_SIZE)
        }
        onClick={handleIncrement}
        className="h-8 w-8"
        aria-label="Increase font size"
        title={`Increase font size (${SHORTCUTS.INCREASE_FONT_SIZE})`}>
        <Plus className="h-4 w-4" />
      </Button>
    </>
  );
}
