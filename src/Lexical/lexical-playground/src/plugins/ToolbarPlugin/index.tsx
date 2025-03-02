/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { JSX } from 'react';
import { $isListNode, ListNode } from '@lexical/list';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import { $isHeadingNode } from '@lexical/rich-text';
import {
  $getSelectionStyleValueForProperty,
  $isParentElementRTL,
  $patchStyleText,
} from '@lexical/selection';
import { $isTableNode, $isTableSelection } from '@lexical/table';
import {
  $findMatchingParent,
  $getNearestNodeOfType,
  $isEditorIsNestedEditor,
  mergeRegister,
} from '@lexical/utils';
import {
  $createParagraphNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  ElementFormatType,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  LexicalEditor,
  NodeKey,
  OUTDENT_CONTENT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import { Dispatch, useCallback, useEffect, useState } from 'react';
import { IS_APPLE } from 'shared/environment';

import {
  blockTypeToBlockName,
  useToolbarState,
} from '../../context/ToolbarContext';
import useModal from '../../hooks/useModal';
import { getSelectedNode } from '../../utils/getSelectedNode';
import {
  InsertImageDialog,
} from '../ImagesPlugin';

import { INSERT_PAGE_BREAK } from '../PageBreakPlugin';
import { SHORTCUTS } from '../ShortcutsPlugin/shortcuts';
import FontSize from './fontSize';
import {
  clearFormatting,
  formatBulletList,
  formatCheckList,
  formatHeading,
  formatNumberedList,
  formatParagraph,
  formatQuote,
} from './utils';
import { $createHelloWorldNode } from '../../nodes/HelloWorldNode';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ChevronDown, MoreHorizontal, Bold, Italic, Underline, Link, AlignLeft, AlignCenter, AlignRight, AlignJustify, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Quote, Code, Minus, SeparatorHorizontal, Image, Bot, Type, Superscript, Subscript, Strikethrough, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { $createSceneBeatNode } from '../../nodes/SceneBeatNode';

const rootTypeToRootName = {
  root: 'Root',
  table: 'Table',
};

const FONT_FAMILY_OPTIONS: [string, string][] = [
  ['Arial', 'Arial'],
  ['Courier New', 'Courier New'],
  ['Georgia', 'Georgia'],
  ['Times New Roman', 'Times New Roman'],
  ['Trebuchet MS', 'Trebuchet MS'],
  ['Verdana', 'Verdana'],
];

const FONT_SIZE_OPTIONS: [string, string][] = [
  ['10px', '10px'],
  ['11px', '11px'],
  ['12px', '12px'],
  ['13px', '13px'],
  ['14px', '14px'],
  ['15px', '15px'],
  ['16px', '16px'],
  ['17px', '17px'],
  ['18px', '18px'],
  ['19px', '19px'],
  ['20px', '20px'],
];

const ELEMENT_FORMAT_OPTIONS: {
  [key in Exclude<ElementFormatType, ''>]: {
    icon: string;
    iconRTL: string;
    name: string;
  };
} = {
  center: {
    icon: 'center-align',
    iconRTL: 'center-align',
    name: 'Center Align',
  },
  end: {
    icon: 'right-align',
    iconRTL: 'left-align',
    name: 'End Align',
  },
  justify: {
    icon: 'justify-align',
    iconRTL: 'justify-align',
    name: 'Justify Align',
  },
  left: {
    icon: 'left-align',
    iconRTL: 'left-align',
    name: 'Left Align',
  },
  right: {
    icon: 'right-align',
    iconRTL: 'right-align',
    name: 'Right Align',
  },
  start: {
    icon: 'left-align',
    iconRTL: 'right-align',
    name: 'Start Align',
  },
};

function dropDownActiveClass(active: boolean) {
  if (active) {
    return 'active dropdown-item-active';
  } else {
    return '';
  }
}

function BlockFormatDropDown({
  editor,
  blockType,
  rootType,
  disabled,
}: {
  blockType: keyof typeof blockTypeToBlockName;
  rootType: string;
  editor: LexicalEditor;
  disabled: boolean;
}): JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-8 gap-1 font-normal hover:bg-accent/50 transition-colors"
        >
          {blockTypeToBlockName[blockType]}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px]">
        {blockTypeToBlockName.paragraph !== undefined && (
          <DropdownMenuItem
            className="hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => {
              formatParagraph(editor);
            }}>
            <span className="text">{blockTypeToBlockName.paragraph}</span>
          </DropdownMenuItem>
        )}
        {blockTypeToBlockName.h1 !== undefined && (
          <DropdownMenuItem
            className="hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => {
              formatHeading(editor, blockType, 'h1');
            }}>
            <span className="text">{blockTypeToBlockName.h1}</span>
          </DropdownMenuItem>
        )}
        {blockTypeToBlockName.h2 !== undefined && (
          <DropdownMenuItem
            className="hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => {
              formatHeading(editor, blockType, 'h2');
            }}>
            <span className="text">{blockTypeToBlockName.h2}</span>
          </DropdownMenuItem>
        )}
        {blockTypeToBlockName.h3 !== undefined && (
          <DropdownMenuItem
            className="hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => {
              formatHeading(editor, blockType, 'h3');
            }}>
            <span className="text">{blockTypeToBlockName.h3}</span>
          </DropdownMenuItem>
        )}
        {blockTypeToBlockName.bullet !== undefined && (
          <DropdownMenuItem
            className="hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => {
              formatBulletList(editor, blockType);
            }}>
            <span className="text">{blockTypeToBlockName.bullet}</span>
          </DropdownMenuItem>
        )}
        {blockTypeToBlockName.number !== undefined && (
          <DropdownMenuItem
            className="hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => {
              formatNumberedList(editor, blockType);
            }}>
            <span className="text">{blockTypeToBlockName.number}</span>
          </DropdownMenuItem>
        )}
        {blockTypeToBlockName.check !== undefined && (
          <DropdownMenuItem
            className="hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => {
              formatCheckList(editor, blockType);
            }}>
            <span className="text">{blockTypeToBlockName.check}</span>
          </DropdownMenuItem>
        )}
        {blockTypeToBlockName.quote !== undefined && (
          <DropdownMenuItem
            className="hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => {
              formatQuote(editor, blockType);
            }}>
            <span className="text">{blockTypeToBlockName.quote}</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Divider(): JSX.Element {
  return <div className="divider" />;
}

function FontDropDown({
  editor,
  value,
  style,
  disabled = false,
}: {
  editor: LexicalEditor;
  value: string;
  style: string;
  disabled?: boolean;
}): JSX.Element {
  const handleClick = useCallback(
    (option: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if (selection !== null) {
          $patchStyleText(selection, {
            [style]: option,
          });
        }
      });
    },
    [editor, style],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-8 gap-1 font-normal hover:bg-accent/50 transition-colors"
        >
          {value}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px]">
        {(style === 'font-family' ? FONT_FAMILY_OPTIONS : FONT_SIZE_OPTIONS).map(
          ([option, text]) => (
            <DropdownMenuItem
              key={option}
              className="hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => handleClick(option)}
            >
              <span className="text">{text}</span>
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ElementFormatDropdown({
  editor,
  value,
  isRTL,
  disabled = false,
}: {
  editor: LexicalEditor;
  value: ElementFormatType;
  isRTL: boolean;
  disabled: boolean;
}) {
  const formatOption = ELEMENT_FORMAT_OPTIONS[value || 'left'];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-8 gap-1 font-normal hover:bg-accent/50 transition-colors"
        >
          {formatOption.name}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px]">
        <DropdownMenuItem
          className="hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
          }}>
          <div className="flex items-center gap-2">
            <i className="icon left-align" />
            <span className="text">Left Align</span>
          </div>
          <span className="ml-auto text-xs text-muted-foreground">{SHORTCUTS.LEFT_ALIGN}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
          }}>
          <div className="flex items-center gap-2">
            <i className="icon center-align" />
            <span className="text">Center Align</span>
          </div>
          <span className="ml-auto text-xs text-muted-foreground">{SHORTCUTS.CENTER_ALIGN}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
          }}>
          <div className="flex items-center gap-2">
            <i className="icon right-align" />
            <span className="text">Right Align</span>
          </div>
          <span className="ml-auto text-xs text-muted-foreground">{SHORTCUTS.RIGHT_ALIGN}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
          }}>
          <div className="flex items-center gap-2">
            <i className="icon justify-align" />
            <span className="text">Justify Align</span>
          </div>
          <span className="ml-auto text-xs text-muted-foreground">{SHORTCUTS.JUSTIFY_ALIGN}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'start');
          }}>
          <div className="flex items-center gap-2">
            <i className={`icon ${isRTL ? ELEMENT_FORMAT_OPTIONS.start.iconRTL : ELEMENT_FORMAT_OPTIONS.start.icon}`} />
            <span className="text">Start Align</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'end');
          }}>
          <div className="flex items-center gap-2">
            <i className={`icon ${isRTL ? ELEMENT_FORMAT_OPTIONS.end.iconRTL : ELEMENT_FORMAT_OPTIONS.end.icon}`} />
            <span className="text">End Align</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={() => {
            editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
          }}>
          <div className="flex items-center gap-2">
            <i className={'icon ' + (isRTL ? 'indent' : 'outdent')} />
            <span className="text">Outdent</span>
          </div>
          <span className="ml-auto text-xs text-muted-foreground">{SHORTCUTS.OUTDENT}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={() => {
            editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
          }}>
          <div className="flex items-center gap-2">
            <i className={'icon ' + (isRTL ? 'outdent' : 'indent')} />
            <span className="text">Indent</span>
          </div>
          <span className="ml-auto text-xs text-muted-foreground">{SHORTCUTS.INDENT}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function ToolbarPlugin({
  editor,
  activeEditor,
  setActiveEditor,
  setIsLinkEditMode,
}: {
  editor: LexicalEditor;
  activeEditor: LexicalEditor;
  setActiveEditor: Dispatch<LexicalEditor>;
  setIsLinkEditMode: Dispatch<boolean>;
}): JSX.Element {
  const [selectedElementKey, setSelectedElementKey] = useState<NodeKey | null>(
    null,
  );
  const [modal, showModal] = useModal();
  const [isEditable, setIsEditable] = useState(() => editor.isEditable());
  const { toolbarState, updateToolbarState } = useToolbarState();

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      if (activeEditor !== editor && $isEditorIsNestedEditor(activeEditor)) {
        const rootElement = activeEditor.getRootElement();
        updateToolbarState(
          'isImageCaption',
          !!rootElement?.parentElement?.classList.contains(
            'image-caption-container',
          ),
        );
      } else {
        updateToolbarState('isImageCaption', false);
      }

      const anchorNode = selection.anchor.getNode();
      let element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : $findMatchingParent(anchorNode, (e) => {
            const parent = e.getParent();
            return parent !== null && $isRootOrShadowRoot(parent);
          });

      if (element === null) {
        element = anchorNode.getTopLevelElementOrThrow();
      }

      const elementKey = element.getKey();
      const elementDOM = activeEditor.getElementByKey(elementKey);

      updateToolbarState('isRTL', $isParentElementRTL(selection));

      // Update links
      const node = getSelectedNode(selection);
      const parent = node.getParent();

      const tableNode = $findMatchingParent(node, $isTableNode);
      if ($isTableNode(tableNode)) {
        updateToolbarState('rootType', 'table');
      } else {
        updateToolbarState('rootType', 'root');
      }

      if (elementDOM !== null) {
        setSelectedElementKey(elementKey);
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType<ListNode>(
            anchorNode,
            ListNode,
          );
          const type = parentList
            ? parentList.getListType()
            : element.getListType();

          updateToolbarState('blockType', type);
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : element.getType();
          if (type in blockTypeToBlockName) {
            updateToolbarState(
              'blockType',
              type as keyof typeof blockTypeToBlockName,
            );
          }
        }
      }
      // Handle buttons
      updateToolbarState(
        'fontColor',
        $getSelectionStyleValueForProperty(selection, 'color', '#000'),
      );
      updateToolbarState(
        'bgColor',
        $getSelectionStyleValueForProperty(
          selection,
          'background-color',
          '#fff',
        ),
      );
      updateToolbarState(
        'fontFamily',
        $getSelectionStyleValueForProperty(selection, 'font-family', 'Arial'),
      );
      let matchingParent;

      // If matchingParent is a valid node, pass it's format type
      updateToolbarState(
        'elementFormat',
        $isElementNode(matchingParent)
          ? matchingParent.getFormatType()
          : $isElementNode(node)
            ? node.getFormatType()
            : parent?.getFormatType() || 'left',
      );
    }
    if ($isRangeSelection(selection) || $isTableSelection(selection)) {
      // Update text format
      updateToolbarState('isBold', selection.hasFormat('bold'));
      updateToolbarState('isItalic', selection.hasFormat('italic'));
      updateToolbarState('isUnderline', selection.hasFormat('underline'));
      updateToolbarState(
        'isStrikethrough',
        selection.hasFormat('strikethrough'),
      );
      updateToolbarState('isSubscript', selection.hasFormat('subscript'));
      updateToolbarState('isSuperscript', selection.hasFormat('superscript'));
      updateToolbarState(
        'fontSize',
        $getSelectionStyleValueForProperty(selection, 'font-size', '15px'),
      );
      updateToolbarState('isLowercase', selection.hasFormat('lowercase'));
      updateToolbarState('isUppercase', selection.hasFormat('uppercase'));
      updateToolbarState('isCapitalize', selection.hasFormat('capitalize'));
    }
  }, [activeEditor, editor, updateToolbarState]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        setActiveEditor(newEditor);
        $updateToolbar();
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [editor, $updateToolbar, setActiveEditor]);

  useEffect(() => {
    activeEditor.getEditorState().read(() => {
      $updateToolbar();
    });
  }, [activeEditor, $updateToolbar]);

  useEffect(() => {
    return mergeRegister(
      editor.registerEditableListener((editable) => {
        setIsEditable(editable);
      }),
      activeEditor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateToolbar();
        });
      }),
      activeEditor.registerCommand<boolean>(
        CAN_UNDO_COMMAND,
        (payload) => {
          updateToolbarState('canUndo', payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      activeEditor.registerCommand<boolean>(
        CAN_REDO_COMMAND,
        (payload) => {
          updateToolbarState('canRedo', payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
  }, [$updateToolbar, activeEditor, editor, updateToolbarState]);

  const applyStyleText = useCallback(
    (styles: Record<string, string>, skipHistoryStack?: boolean) => {
      activeEditor.update(
        () => {
          const selection = $getSelection();
          if (selection !== null) {
            $patchStyleText(selection, styles);
          }
        },
        skipHistoryStack ? { tag: 'historic' } : {},
      );
    },
    [activeEditor],
  );

  const canViewerSeeInsertDropdown = !toolbarState.isImageCaption;

  return (
    <div className="toolbar">
      <button
        disabled={!toolbarState.canUndo || !isEditable}
        onClick={() => {
          activeEditor.dispatchCommand(UNDO_COMMAND, undefined);
        }}
        title={IS_APPLE ? 'Undo (⌘Z)' : 'Undo (Ctrl+Z)'}
        type="button"
        className="toolbar-item spaced"
        aria-label="Undo">
        <i className="format undo" />
      </button>
      <button
        disabled={!toolbarState.canRedo || !isEditable}
        onClick={() => {
          activeEditor.dispatchCommand(REDO_COMMAND, undefined);
        }}
        title={IS_APPLE ? 'Redo (⇧⌘Z)' : 'Redo (Ctrl+Y)'}
        type="button"
        className="toolbar-item"
        aria-label="Redo">
        <i className="format redo" />
      </button>
      <Divider />
      {toolbarState.blockType in blockTypeToBlockName &&
        activeEditor === editor && (
          <>
            <BlockFormatDropDown
              disabled={!isEditable}
              blockType={toolbarState.blockType}
              rootType={toolbarState.rootType}
              editor={activeEditor}
            />
            <Divider />
          </>
        )}
      <>
        <FontDropDown
          disabled={!isEditable}
          style={'font-family'}
          value={toolbarState.fontFamily}
          editor={activeEditor}
        />
        <Divider />
        <FontSize
          selectionFontSize={toolbarState.fontSize.slice(0, -2)}
          editor={activeEditor}
          disabled={!isEditable}
        />
        <Divider />
        <Button
          disabled={!isEditable}
          onClick={() => {
            activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
          }}
          variant="ghost"
          size="icon"
          className={'h-8 w-8 hover:bg-accent/50 transition-colors ' + (toolbarState.isBold ? 'bg-accent/50' : '')}
          title={`Bold (${SHORTCUTS.BOLD})`}
          aria-label={`Format text as bold. Shortcut: ${SHORTCUTS.BOLD}`}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          disabled={!isEditable}
          onClick={() => {
            activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
          }}
          variant="ghost"
          size="icon"
          className={'h-8 w-8 hover:bg-accent/50 transition-colors ' + (toolbarState.isItalic ? 'bg-accent/50' : '')}
          title={`Italic (${SHORTCUTS.ITALIC})`}
          aria-label={`Format text as italics. Shortcut: ${SHORTCUTS.ITALIC}`}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          disabled={!isEditable}
          onClick={() => {
            activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
          }}
          variant="ghost"
          size="icon"
          className={'h-8 w-8 hover:bg-accent/50 transition-colors ' + (toolbarState.isUnderline ? 'bg-accent/50' : '')}
          title={`Underline (${SHORTCUTS.UNDERLINE})`}
          aria-label={`Format text to underlined. Shortcut: ${SHORTCUTS.UNDERLINE}`}
        >
          <Underline className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={!isEditable}
              className="h-8 w-8 hover:bg-accent/50 transition-colors"
              aria-label="Formatting options for additional text styles"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[180px]">
            <DropdownMenuItem
              className="hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => {
                activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'lowercase');
              }}>
              <div className="flex items-center gap-2">
                <i className="icon lowercase" />
                <span className="text">Lowercase</span>
              </div>
              <span className="ml-auto text-xs text-muted-foreground">{SHORTCUTS.LOWERCASE}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => {
                activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'uppercase');
              }}>
              <div className="flex items-center gap-2">
                <i className="icon uppercase" />
                <span className="text">Uppercase</span>
              </div>
              <span className="ml-auto text-xs text-muted-foreground">{SHORTCUTS.UPPERCASE}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => {
                activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'capitalize');
              }}>
              <div className="flex items-center gap-2">
                <i className="icon capitalize" />
                <span className="text">Capitalize</span>
              </div>
              <span className="ml-auto text-xs text-muted-foreground">{SHORTCUTS.CAPITALIZE}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => {
                activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
              }}>
              <div className="flex items-center gap-2">
                <Strikethrough className="h-4 w-4" />
                <span className="text">Strikethrough</span>
              </div>
              <span className="ml-auto text-xs text-muted-foreground">{SHORTCUTS.STRIKETHROUGH}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => {
                activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript');
              }}>
              <div className="flex items-center gap-2">
                <i className="icon subscript" />
                <span className="text">Subscript</span>
              </div>
              <span className="ml-auto text-xs text-muted-foreground">{SHORTCUTS.SUBSCRIPT}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => {
                activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'superscript');
              }}>
              <div className="flex items-center gap-2">
                <i className="icon superscript" />
                <span className="text">Superscript</span>
              </div>
              <span className="ml-auto text-xs text-muted-foreground">{SHORTCUTS.SUPERSCRIPT}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => clearFormatting(activeEditor)}>
              <div className="flex items-center gap-2">
                <i className="icon clear" />
                <span className="text">Clear Formatting</span>
              </div>
              <span className="ml-auto text-xs text-muted-foreground">{SHORTCUTS.CLEAR_FORMATTING}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {canViewerSeeInsertDropdown && (
          <>
            <div className="w-[1px] h-6 bg-border mx-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!isEditable}
                  className="h-8 gap-1 font-normal hover:bg-accent/50 transition-colors"
                >
                  Insert
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[180px]">
                <DropdownMenuItem
                  className="hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => {
                    activeEditor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
                  }}>
                  <div className="flex items-center gap-2">
                    <Minus className="h-4 w-4" />
                    <span className="text">Horizontal Rule</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => {
                    activeEditor.dispatchCommand(INSERT_PAGE_BREAK, undefined);
                  }}>
                  <div className="flex items-center gap-2">
                    <i className="icon page-break" />
                    <span className="text">Page Break</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => {
                    editor.update(() => {
                      const selection = $getSelection();
                      if (selection) {
                        const beatNode = $createSceneBeatNode();
                        const paragraphNode = $createParagraphNode();
                        selection.insertNodes([beatNode, paragraphNode]);
                      }
                    });
                  }}>
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <span className="text">Scene Beat</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </>
      <Divider />
      <ElementFormatDropdown
        disabled={!isEditable}
        value={toolbarState.elementFormat}
        editor={activeEditor}
        isRTL={toolbarState.isRTL}
      />
      {modal}
    </div>
  );
}
