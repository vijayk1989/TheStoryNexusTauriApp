

# Commands

Commands are a very powerful feature of Lexical that lets you register listeners for events like `KEY_ENTER_COMMAND` or `KEY_TAB_COMMAND` and contextually react to them _wherever_ & _however_ you'd like.

This pattern is useful for building [`Toolbars`](https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/ToolbarPlugin/index.tsx) or complex `Plugins` and `Nodes` such as the [`TablePlugin`](https://github.com/facebook/lexical/tree/main/packages/lexical-table) which require special handling for `selection`, `keyboard events`, and more.

When registering a `command` you supply a `priority` and can return `true` to mark it as "handled", which stops other listeners from receiving the event. If a command isn't handled explicitly by you, it's likely handled by default in the [`RichTextPlugin`](https://github.com/facebook/lexical/blob/main/packages/lexical-rich-text/src/index.ts) or the [`PlainTextPlugin`](https://github.com/facebook/lexical/blob/main/packages/lexical-plain-text/src/index.ts).

## `createCommand(...)`

You can view all of the existing commands in [`LexicalCommands.ts`](https://github.com/facebook/lexical/blob/main/packages/lexical/src/LexicalCommands.ts), but if you need a custom command for your own use case check out the typed `createCommand(...)` function.

```js
const HELLO_WORLD_COMMAND: LexicalCommand<string> = createCommand();

editor.dispatchCommand(HELLO_WORLD_COMMAND, 'Hello World!');

editor.registerCommand(
  HELLO_WORLD_COMMAND,
  (payload: string) => {
    console.log(payload); // Hello World!
    return false;
  },
  LowPriority,
);
```

## `editor.dispatchCommand(...)`

Commands can be dispatched from anywhere you have access to the `editor` such as a Toolbar Button, an event listener, or a Plugin, but most of the core commands are dispatched from [`LexicalEvents.ts`](https://github.com/facebook/lexical/blob/main/packages/lexical/src/LexicalEvents.ts).

Calling `dispatchCommand` will implicitly call `editor.update` to trigger its command listeners if it was not called from inside `editor.update`.

```js
editor.dispatchCommand(command, payload);
```

The `payload`s are typed via the `createCommand(...)` API, but they're usually a DOM `event` for commands dispatched from an event listener.

Here are some real examples from [`LexicalEvents.ts`](https://github.com/facebook/lexical/blob/main/packages/lexical/src/LexicalEvents.ts).

```js
editor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, event);
// ...
editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
```

And another example from the [`ToolbarPlugin`](https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/ToolbarPlugin/index.tsx) in our Playground.

```js
const formatBulletList = () => {
  editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND);
};
```

Which is later handled in [`useList`](https://github.com/facebook/lexical/blob/1f62ace08e15d55515f3750840133efecd6d7d01/packages/lexical-react/src/shared/useList.js#L65) to insert the list into the editor.

```js
editor.registerCommand(
  INSERT_UNORDERED_LIST_COMMAND,
  () => {
    insertList(editor, 'ul');
    return true;
  },
  COMMAND_PRIORITY_LOW,
);
```

## `editor.registerCommand(...)`

You can register a command from anywhere you have access to the `editor` object, but it's important that you remember to clean up the listener with its remove listener callback when it's no longer needed.

The command listener will always be called from an `editor.update`, so you may use dollar functions. You should not use
`editor.update` (and *never* call `editor.read`) synchronously from within a command listener. It is safe to call
`editor.getEditorState().read` if you need to read the previous state after updates have already been made.

```js
const removeListener = editor.registerCommand(
  COMMAND,
  (payload) => boolean, // Return true to stop propagation.
  priority,
);
// ...
removeListener(); // Cleans up the listener.
```

A common pattern for easy clean-up is returning a `registerCommand` call within a React `useEffect`.

```jsx
useEffect(() => {
  return editor.registerCommand(
    TOGGLE_LINK_COMMAND,
    (payload) => {
      const url: string | null = payload;
      setLink(url);
      return true;
    },
    COMMAND_PRIORITY_EDITOR,
  );
}, [editor]);
```

And as seen above and below, `registerCommand`'s callback can return `true` to signal to the other listeners that the command has been handled and propagation will be stopped.

Here's a simplified example of handling a `KEY_TAB_COMMAND` from the [`RichTextPlugin`](https://github.com/facebook/lexical/blob/76b28f4e2b70f1194cc8148dcc30c9f9ec61f811/packages/lexical-rich-text/src/index.js#L625), which is used to dispatch a `OUTDENT_CONTENT_COMMAND` or `INDENT_CONTENT_COMMAND`.

```js
editor.registerCommand(
  KEY_TAB_COMMAND,
  (payload) => {
    const event: KeyboardEvent = payload;
    event.preventDefault();
    return editor.dispatchCommand(
      event.shiftKey ? OUTDENT_CONTENT_COMMAND : INDENT_CONTENT_COMMAND,
    );
  },
  COMMAND_PRIORITY_EDITOR,
);
```

Note that the same `KEY_TAB_COMMAND` command is registered by [`LexicalTableSelectionHelpers.js`](https://github.com/facebook/lexical/blob/1f62ace08e15d55515f3750840133efecd6d7d01/packages/lexical-table/src/LexicalTableSelectionHelpers.js#L733), which handles moving focus to the next or previous cell within a `Table`, but the priority is the highest it can be (`4`) because this behavior is very important.
# Creating a React Plugin

In addition to using the Lexical React plugins offered by the core library, you can make your own plugins to extend or alter Lexical's functionality to suit your own use cases.

Lexical's React plugin interface is simple - just create a React component and add it as a child of your LexicalComposer component:

```jsx
 <LexicalComposer>
    <MyLexicalPlugin>
 </LexicalComposer>
```

If the Plugin introduces new nodes, they have to be registered in `initialConfig.nodes`:

```js
const initialConfig = {
  namespace: 'MyEditor',
  nodes: [MyLexicalNode],
};
```

```jsx
 <LexicalComposer initialConfig={initialConfig}>
    <MyLexicalPlugin>
 </LexicalComposer>
```

LexicalComposer provides access to the underlying LexicalEditor instance via React Context:

```jsx
//MyLexicalPlugin.js

export function MyLexicalPlugin(props) {
    const [editor] = useLexicalComposerContext();
    ...
}
```

With access to the Editor, your plugin can extend Lexical via [Commands](https://lexical.dev/docs/concepts/commands), [Transforms](https://lexical.dev/docs/concepts/transforms), or other APIs. For example, the [TwitterPlugin](https://github.com/facebook/lexical/blob/0775ab929e65723433626fa8c25900941e7f232f/packages/lexical-playground/src/plugins/TwitterPlugin/index.ts#L18) embeds a tweet into the editor, fetching the data asynchronously from Twitter based on the provided Tweet ID:

```jsx
export const INSERT_TWEET_COMMAND: LexicalCommand<string> = createCommand();

export default function TwitterPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([TweetNode])) {
      throw new Error('TwitterPlugin: TweetNode not registered on editor (initialConfig.nodes)');
    }

    return editor.registerCommand<string>(
      INSERT_TWEET_COMMAND,
      (payload) => {
        const tweetNode = $createTweetNode(payload);
        $insertNodeToNearestRoot(tweetNode);

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}
```

TwitterPlugin is just a React component that accesses the Lexical editor via React Context (useLexicalComposerContext). Using the LexicalEditor instance, this plugin does two things:

1. Verifies that there is a TweetNode registered on the editor (if you forget to register the node, you can't do #2)
2. registers a "command", passing a callback that will run when that command is dispatched. The command callback creates and inserts a TweetNode in the editor.

You can see how [TwitterPlugin is used in the playground](https://github.com/facebook/lexical/blob/0775ab929e65723433626fa8c25900941e7f232f/packages/lexical-playground/src/Editor.tsx#L137). It's added as a child of a LexicalComposer component, which does the job of providing the Context necessary for access to the editor instance. To actually trigger this command callback and insert a [TweetNode](https://github.com/facebook/lexical/blob/b0fa38615c03f1c4fc7c8c5ea26412b723770e55/packages/lexical-playground/src/nodes/TweetNode.tsx#L212), we have a [button](https://github.com/facebook/lexical/blob/b0fa38615c03f1c4fc7c8c5ea26412b723770e55/packages/lexical-playground/src/plugins/ToolbarPlugin.tsx#L534) that "dispatches" the Tweet command we registered in the plugin.

While the TwitterPlugin registers a command that inserts a custom node, this is only one example of what can be done with a plugin. To get a better idea of what's possible, take a look at the [plugins defined in the playground](https://github.com/facebook/lexical/tree/0775ab929e65723433626fa8c25900941e7f232f/packages/lexical-playground/src/plugins).
---
sidebar_position: 15
---

# Creating a Plugin

This page covers Lexical plugin creation, independently of any framework or library. For those not yet familiar with Lexical it's advisable to [check out the Quick Start (Vanilla JS) page](/docs/getting-started/quick-start).

Lexical, on the contrary to many other frameworks, doesn't define any specific interface for its plugins. The plugin in its simplest form is a function that accepts a `LexicalEditor` instance, and returns a cleanup function. With access to the `LexicalEditor`, plugin can extend editor via [Commands](/docs/concepts/commands), [Transforms](/docs/concepts/transforms), [Nodes](/docs/concepts/nodes), or other APIs.

In this guide we'll create plugin that replaces smiles (`:)`, `:P`, etc...) with actual emojis (using [Node Transforms](/docs/concepts/transforms)) and uses own graphics for emojis rendering by creating our own custom node that extends [TextNode](/docs/concepts/nodes#textnode).

<figure class="text--center">
 <img src="/img/docs/lexical-emoji-plugin-design.drawio.svg" alt="Conceptual View"/>
</figure>

## Preconditions

We assume that you have already implemented (see `findEmoji.ts` within provided code) function that allows you to find emoji shortcodes (smiles) in text and return their position as well as some other info:

```typescript
// findEmoji.ts
export type EmojiMatch = Readonly<{position: number, shortcode: string, unifiedID: string}>;

export default function findEmoji(text: string): EmojiMatch | null;
```

## Creating own `LexicalNode`

Lexical as a framework provides 2 ways to customize appearance of it's content:
- By extending one of the base nodes:
   - [`ElementNode`](/docs/concepts/nodes#elementnode) – used as parent for other nodes, can be block level or inline.
   - [`TextNode`](/docs/concepts/nodes#textnode) - leaf type (_so it can't have child elements_) of node that contains text.
   - [`DecoratorNode`](/docs/concepts/nodes#decoratornode) - useful to insert arbitrary view (component) inside the editor.
- Via [Node Overrides](/docs/concepts/node-replacement) – useful if you want to augment behavior of the built in nodes, such as `ParagraphNode`.

As in our case we don't expect `EmojiNode` to have any child nodes nor we aim to insert arbitrary component the best choice for us is to proceed with [`TextNode`](/docs/concepts/nodes#textnode) extension.

```typescript
export class EmojiNode extends TextNode {
  __unifiedID: string;

  static getType(): string {
    return 'emoji';
  }

  static clone(node: EmojiNode): EmojiNode {
    return new EmojiNode(node.__unifiedID, node.__key);
  }

  constructor(unifiedID: string, key?: NodeKey) {
    const unicodeEmoji = /*...*/;
    super(unicodeEmoji, key);

    this.__unifiedID = unifiedID.toLowerCase();
  }

  /**
  * DOM that will be rendered by browser within contenteditable
  * This is what Lexical renders
  */
  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement('span');
    dom.className = 'emoji-node';
    dom.style.backgroundImage = `url('${BASE_EMOJI_URI}/${this.__unifiedID}.png')`;
    dom.innerText = this.__text;

    return dom;
  }

  static importJSON(serializedNode: SerializedEmojiNode): EmojiNode {
    return $createEmojiNode(serializedNode.unifiedID).updateFromJSON(serializedNode);
  }

  exportJSON(): SerializedEmojiNode {
    return {
      ...super.exportJSON(),
      unifiedID: this.__unifiedID,
    };
  }
}
```

Example above represents absolute minimal setup of the custom node that extends [`TextNode`](/docs/concepts/nodes#textnode). Let's look at the key elements here:

- `constructor(...)` + class props – Allows us to store custom data within nodes at runtime as well as accept custom parameters.
- `getType()` & `clone(...)` – methods allow Lexical to correctly identify node type as well as being able to clone it correctly as we may want to customize cloning behavior.
- `importJSON(...)` & `exportJSON()` – define how our data will be serialized / deserialized to/from Lexical state. Here you define your node presentation in state.
- `createDOM(...)` – defines DOM that will be rendered by Lexical

## Creating Node Transform

[Transforms](/docs/concepts/transforms) allow efficient response to changes to the `EditorState`, and so user input. Their efficiency comes from the fact that transforms are executed before DOM reconciliation (the most expensive operation in Lexical's life cycle).

Additionally it's important to mention that [Lexical Node Transforms](/docs/concepts/transforms) are smart enough to allow you not to think about any side effects of the modifications done within transform or interdependencies with other transform listeners. Rule of thumb here is that changes done to the node within a particular transform will trigger rerun of the other transforms till no changes are made to the `EditorState`. Read more about it in [Transform heuristic](/docs/concepts/transforms#transform-heuristic).

In our example we have simple transform that executes the following business logic:
1. Attempt to transform `TextNode`. It will be run on any change to `TextNode`'s.
2. Check if emoji shortcodes (smiles) are present in the text within `TextNode`. Skip if none.
3. Split `TextNode` into 2 or 3 pieces (depending on the position of the shortcode in text) so target emoji shortcode has own dedicated `TextNode`
4. Replace emoji shortcode `TextNode` with `EmojiNode`


```typescript
import {LexicalEditor, TextNode} from 'lexical';


import {$createEmojiNode} from './EmojiNode';
import findEmoji from './findEmoji';


function textNodeTransform(node: TextNode): void {
  if (!node.isSimpleText() || node.hasFormat('code')) {
    return;
  }

  const text = node.getTextContent();

  // Find only 1st occurrence as transform will be re-run anyway for the rest
  // because newly inserted nodes are considered to be dirty
  const emojiMatch = findEmoji(text);
  if (emojiMatch === null) {
    return;
  }

  let targetNode;
  if (emojiMatch.position === 0) {
    // First text chunk within string, splitting into 2 parts
    [targetNode] = node.splitText(
      emojiMatch.position + emojiMatch.shortcode.length,
    );
  } else {
    // In the middle of a string
    [, targetNode] = node.splitText(
      emojiMatch.position,
      emojiMatch.position + emojiMatch.shortcode.length,
    );
  }


  const emojiNode = $createEmojiNode(emojiMatch.unifiedID);
  targetNode.replace(emojiNode);
}


export function registerEmoji(editor: LexicalEditor): () => void {
  // We don't use editor.registerUpdateListener here as alternative approach where we rely
  // on update listener is highly discouraged as it triggers an additional render (the most expensive lifecycle operation).
  return editor.registerNodeTransform(TextNode, textNodeTransform);
}
```

## Putting it all together

Finally we configure Lexical instance with our newly created plugin by registering `EmojiNode` within editor config and executing `registerEmoji(editor)` plugin bootstrap function. Here for that sake of simplicity we assume that the plugin picks its own approach for CSS & Static Assets distribution (if any), Lexical doesn't enforce any rules on that.

Refer to [Quick Start (Vanilla JS) Example](/docs/getting-started/quick-start#putting-it-together) to fill the gaps in this pseudocode.

```typescript
import {createEditor} from 'lexical';
import {mergeRegister} from '@lexical/utils';
/* ... */

import {EmojiNode} from './emoji-plugin/EmojiNode';
import {registerEmoji} from './emoji-plugin/EmojiPlugin';

const initialConfig = {
  /* ... */
  // Register our newly created node
  nodes: [EmojiNode, /* ... */],
};

const editor = createEditor(config);

const editorRef = document.getElementById('lexical-editor');
editor.setRootElement(editorRef);

// Registering Plugins
mergeRegister(
  /* ... */
  registerEmoji(editor), // Our plugin
);
```

<iframe width="100%" height="400" src="https://stackblitz.com/github/facebook/lexical/tree/main/examples/vanilla-js-plugin?embed=1&file=src%2Femoji-plugin%2FEmojiPlugin.ts&terminalHeight=1&ctl=1" sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"></iframe>


# Working with DOM Events

Sometimes, when working with Lexical, it might be necessary or useful for you to attach a DOM Event Listener to the underlying DOM nodes that Lexical controls. For instance, you might want to show a popover when a user mouses over a specific node or open a modal when they click on a node. Either of these use cases (and many others) can be accomplished via native DOM Event Listeners. There are 3 main ways that you can listen for DOM Events on nodes controlled by Lexical:

## 1. Event Delegation

One way to handle events inside the editor is to set a listener on the editor root element (the contentEditable Lexical attaches to). You can do this using a [Root Listener](https://lexical.dev/docs/concepts/listeners).

```js
function myListener(event) {
    // You may want to filter on the event target here
    // to only include clicks on certain types of DOM Nodes.
    alert('Nice!');
}

const removeRootListener = editor.registerRootListener((rootElement, prevRootElement) => {
    // add the listener to the current root element
    rootElement.addEventListener('click', myListener);
    // remove the listener from the old root element - make sure the ref to myListener
    // is stable so the removal works and you avoid a memory leak.
    prevRootElement.removeEventListener('click', myListener);
});

// teardown the listener - return this from your useEffect callback if you're using React.
removeRootListener();
```
This can be a simple, efficient way to handle some use cases, since it's not necessary to attach a listener to each DOM node individually.

## 2. Directly Attach Handlers

In some cases, it may be better to attach an event handler directly to the underlying DOM node of each specific node. With this approach, you generally don't need to filter the event target in the handler, which can make it a bit simpler. It will also guarantee that your handler isn't running for events that you don't care about. This approach is implemented via a [Mutation Listener](https://lexical.dev/docs/concepts/listeners).

```js
const registeredElements: WeakSet<HTMLElement> = new WeakSet();
const removeMutationListener = editor.registerMutationListener(nodeType, (mutations) => {
    editor.getEditorState().read(() => {
        for (const [key, mutation] of mutations) {
            const element: null | HTMLElement = editor.getElementByKey(key);
            if (
                // Updated might be a move, so that might mean a new DOM element
                // is created. In this case, we need to add an event listener too.
                (mutation === 'created' || mutation === 'updated') &&
                element !== null &&
                !registeredElements.has(element)
            ) {
                registeredElements.add(element);
                element.addEventListener('click', (event: Event) => {
                    alert('Nice!');
                });
            }
        }
    });
});

// teardown the listener - return this from your useEffect callback if you're using React.
removeMutationListener();
```
Notice that here we don't worry about cleaning up, as Lexical will dereference the underlying DOM nodes and allow the JavaScript runtime garbage collector to clean up their listeners.

## 3. Use NodeEventPlugin

If you're using React, we've wrapped approach #2 up into a simple LexicalComposer plugin that you can use to achieve the same effect, without worrying about the details:

```jsx
<LexicalComposer>
    <NodeEventPlugin
        nodeType={LinkNode}
        eventType={'click'}
        eventListener={(e: Event) => {
            alert('Nice!');
        }}
    />
</LexicalComposer>
```


# Editor State

## Why is it necessary?

With Lexical, the source of truth is not the DOM, but rather an underlying state model
that Lexical maintains and associates with an editor instance.

While HTML is great for storing rich text content it's often "way too flexible" when it comes to text editing.
For example the following lines of content will produce equal outcome:

```html
<i><b>Lexical</b></i>
<i><b>Lex<b><b>ical</b></i>
<b><i>Lexical</i></b>
```

<details>
  <summary>See rendered version!</summary>
  <div>
    <i><b>Lexical</b></i>
    <i><b>Lex</b><b>ical</b></i>
    <b><i>Lexical</i></b>
  </div>
</details>

Of course, there are ways to normalize all these variants to a single canonical form, however this would require DOM manipulation and so re-rendering of the content. And to overcome this we can use Virtual DOM, or State.

On top of that it allows to decouple content structure from content formatting. Let's look at this example stored in HTML:

```html
<p>Why did the JavaScript developer go to the bar? <b>Because he couldn't handle his <i>Promise</i>s</b></p>
```

<figure class="text--center">
  <img src="/img/docs/state-formatting-html.drawio.svg" alt="Nested structure of the HTML state"/>
  <figcaption>Nested structure of the HTML state because of the formatting</figcaption>
</figure>

In contrast, Lexical decouples structure from formatting by offsetting this information to attributes. This allows us to have canonical document structure regardless of the order in which different styles were applied.

<figure class="text--center">
  <img src="/img/docs/state-formatting-lexical.png" alt="Flat Lexical state"/>
  <figcaption>Flat Lexical state structure</figcaption>
</figure>

## Understanding the Editor State

You can get the latest editor state from an editor by calling `editor.getEditorState()`.

Editor states have two phases:

- During an update they can be thought of as "mutable". See "Updating state" below to
  mutate an editor state.
- After an update, the editor state is then locked and deemed immutable from there on. This
  editor state can therefore be thought of as a "snapshot".

Editor states contain two core things:

- The editor node tree (starting from the root node).
- The editor selection (which can be null).

Editor states are serializable to JSON, and the editor instance provides a useful method
to deserialize stringified editor states.

Here's an example of how you can initialize editor with some state and then persist it:

```js
// Get editor initial state (e.g. loaded from backend)
const loadContent = async () => {
  // 'empty' editor
  const value = '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';

  return value;
}

const initialEditorState = await loadContent();
const editor = createEditor(...);
registerRichText(editor, initialEditorState);

...

// Handler to store content (e.g. when user submits a form)
const onSubmit = () => {
  await saveContent(JSON.stringify(editor.getEditorState()));
}
```

For React it could be something like the following:

```jsx
const initialEditorState = await loadContent();
const editorStateRef = useRef(undefined);

<LexicalComposer initialConfig={{
  editorState: initialEditorState
}}>
  <LexicalRichTextPlugin />
  <LexicalOnChangePlugin onChange={(editorState) => {
    editorStateRef.current = editorState;
  }} />
  <Button label="Save" onPress={() => {
    if (editorStateRef.current) {
      saveContent(JSON.stringify(editorStateRef.current))
    }
  }} />
</LexicalComposer>
```

Note that Lexical uses `initialConfig.editorState` only once (when it's being initialized) and passing different value later
won't be reflected in editor. See "Update state" below for proper ways of updating editor state.

## Updating state

:::tip

For a deep dive into how state updates work, check out [this blog post](https://dio.la/article/lexical-state-updates) by Lexical contributor [@DaniGuardiola](https://twitter.com/daniguardio_la).

:::

The most common way to update the editor is to use `editor.update()`. Calling this function
requires a function to be passed in that will provide access to mutate the underlying
editor state. When starting a fresh update, the current editor state is cloned and
used as the starting point. From a technical perspective, this means that Lexical leverages a technique
called double-buffering during updates. There's the "current" frozen editor state to represent what was
most recently reconciled to the DOM, and another work-in-progress "pending" editor state that represents
future changes for the next reconciliation.

Reconciling an update is typically an async process that allows Lexical to batch multiple synchronous
updates of the editor state together in a single update to the DOM – improving performance. When
Lexical is ready to commit the update to the DOM, the underlying mutations and changes in the update
batch will form a new immutable editor state. Calling `editor.getEditorState()` will then return the
latest editor state based on the changes from the update.

Here's an example of how you can update an editor instance:

```js
import {$getRoot, $getSelection} from 'lexical';
import {$createParagraphNode} from 'lexical';

// Inside the `editor.update` you can use special $ prefixed helper functions.
// These functions cannot be used outside the closure, and will error if you try.
// (If you're familiar with React, you can imagine these to be a bit like using a hook
// outside of a React function component).
editor.update(() => {
  // Get the RootNode from the EditorState
  const root = $getRoot();

  // Get the selection from the EditorState
  const selection = $getSelection();

  // Create a new ParagraphNode
  const paragraphNode = $createParagraphNode();

  // Create a new TextNode
  const textNode = $createTextNode('Hello world');

  // Append the text node to the paragraph
  paragraphNode.append(textNode);

  // Finally, append the paragraph to the root
  root.append(paragraphNode);
});
```

Another way to set state is `setEditorState` method, which replaces current state with the one passed as an argument.

Here's an example of how you can set editor state from a stringified JSON:

```js
const editorState = editor.parseEditorState(editorStateJSONString);
editor.setEditorState(editorState);
```

## State update listener

If you want to know when the editor updates so you can react to the changes, you can add an update
listener to the editor, as shown below:

```js
editor.registerUpdateListener(({editorState}) => {
  // The latest EditorState can be found as `editorState`.
  // To read the contents of the EditorState, use the following API:

  editorState.read(() => {
    // Just like editor.update(), .read() expects a closure where you can use
    // the $ prefixed helper functions.
  });
});
```

## When are Listeners, Transforms, and Commands called?

There are several types of callbacks that can be registered with the editor that are related to
updates of the Editor State.

| Callback Type | When It's Called |
| -- | -- |
| Update Listener | After reconciliation |
| Mutation Listener | After reconciliation |
| Node Transform | During `editor.update()`, after the callback finishes, if any instances of the node type they are registered for were updated |
| Command | As soon as the command is dispatched to the editor (called from an implicit `editor.update()`) |

## Synchronous reconciliation with discrete updates

While commit scheduling and batching are normally what we want, they can sometimes get in the way.

Consider this example: you're trying to manipulate an editor state in a server context and then persist it in a database.

```js
editor.update(() => {
  // manipulate the state...
});

saveToDatabase(editor.getEditorState().toJSON());
```

This code will not work as expected, because the `saveToDatabase` call will happen before the state has been committed.
The state that will be saved will be the same one that existed before the update.

Fortunately, the `discrete` option for `LexicalEditor.update` forces an update to be immediately committed.

```js
editor.update(() => {
  // manipulate the state...
}, {discrete: true});

saveToDatabase(editor.getEditorState().toJSON());
```

### Cloning state

Lexical state can be cloned, optionally with custom selection. One of the scenarios where you'd want to do it
is setting editor's state but not forcing any selection:

```js
// Passing `null` as a selection value to prevent focusing the editor
editor.setEditorState(editorState.clone(null));
```
# useHistory

Lexical's useHistory adds support for Undo and Redo. Part of undo and redo requires supporting coalescing of certain dynamic operations such as continuous typing. The below provides background information regarding the continuous typing undo coalescing feature.

**Undo Coalescing of Typed Text**

**TL;DR**
When working with text editors, users expect a well polished undo experience. A key part of this is a smooth, well thought out workflow when undoing continuous typing events. For this post, strict typing events may be limited to typing characters, backspacing and forward deleting. Users generally expect that continuous typing should fully undo with a single undo gesture and that they don’t require separate undo gestures for each character.
The algorithm that covers this is “undo coalescing of typed text” and there’s a certain degree of nuance involved. This post covers that nuance while attempting to avoid prescriptive implementation details.

**What Kind of Edits Require Coalescing?**
As mentioned above, continuous typing should be coalesced into a single undo action. Continuous typing is a loaded phrase and we’ll get into some details below.
There are other types of edits that require undo coalescing such as rapidly resizing an image or rapidly changing the font size of selected text. These latter two examples fall under what might be termed “dynamic operations” and their implementation might vary quite a bit from coalescing of typing.

**What Constitutes Continuous Typing?**
For the purposes of undo coalescing, continuous typing events are safely limited to these three actions:

1. Forward typing characters (heads up, composed character typing discussed later).
2. Deleting backwards, e.g. backspace gestures including backspace key presses.
3. Forward deletion, e.g. forward delete gestures including Delete key presses.

Any interruption to the above breaks the notion of continuous typing. Note that switching between either of these three actions may itself be considered an interruption of continuous typing or it may not. This ends up being a usability decision. In my opinion, when examining various word processors, switching between these three actions should maintain continuity, because users often make typos or corrections in the flow of typing and therefore would lean towards the whole sequence of typing, backspacing and deleting to be within a single undoable session.
Note that Google Docs and Quip treat a switch between typing, backspacing and deleting as disruptions to the continuous typing sessions.

**Start with Selected Text and Followup with Typing**
Let’s start with some selected text. The user may have selected the text directly, as a result of pasting text or through some other sequence of steps. When followed by continuous typing, the initial selection should be included along with the following typing events as part of a single coalesced undo session.

**Timeouts**
Text editing is generally a modeless user experience and so just about any event beyond the above typing actions will disrupt continuous typing. The first and foremost is a timeout.
Quip seems to require continuous typing to occur within 1 second intervals, whereas Google Docs requires about 2 seconds. In my opinion, the timeout may stretch to as long as 3 to 5 seconds. The more time between typing events, the more chance the user has to intentionally input a block of text, a thought or concept.
The use of a timeout is not necessarily required, and the amount of time is certainly up for debate. Collaborative co-editing also makes use of timeouts when grouping text that is merged across clients. Longer timeouts tend to make collaboration a smoother, less disruptive experience, because receiving other client input while expressing one’s thoughts tends to be unhelpful.
Implementers should consider the correct timeout based on their customer expectations and related collaborative features that might share this timeout.

**Hard and Soft Returns**
Hard returns as generated by pressing the Return key tend to disrupt and thereby reset continuous typing.
For Google Docs and Quip, soft returns as generated by pressing shift+Return key do not terminate continuous typing. This makes sense in that the soft return ends text wrap but does not end the paragraph.

**Changing Selections and Key Focus**
Any change to the selection by the user should terminate coalescing. This includes:

- Arrow gesture navigation.
- Gestures to select a word, a sentence or a paragraph.
- Any other selection change that does not move the blinking caret to the next or previous character by way of the above mentioned typing events.

Additionally, ending keyboard focus on the editing window, including moving focus to another editing window or a different view within the same window should also terminate coalescing. This also includes setting focus to modal popovers, such as, for example, a hyperlink property editor.

**Composed Characters**
Character composition occurs when typing diacritics, CJK and even emojis. The process usually involves at least these three phases:

- Start composition.
- Replace composed text with other text and remain composing. This step may occur many times within a single composition session.
- Stop composition either through accepting the text or canceling the latest input.

Coalescing should terminate at start composition. Replacing composed text should generally be coalesced. Stopping composition may or may not reset coalescing depending upon the implementation. Quip appears to try to coalesce multiple composed characters, but disrupts coalescing when switching between composed and non-composed characters. Google Docs appears to disrupt coalescing more frequently. Both coalesce the text replacements.

**Auto Correct, Spelling Corrections and Text Substitutions**
Text substitution behaves much like composed characters. When the text is transformed, the coalescing should terminate and the transformed text becomes the first coalesced entry in the next undo session.

**Copy & Pasting**
Any actions like copy and paste typically trigger events that are not part of the 3 continuous typing actions described above. So, copy and paste also terminates coalescing.

**In Conclusion**
Text undo coalescing greatly improves the usability of undo in that it allows the user to bypass all the intermediate events that went into forming or re-forming text within a paragraph. Given the modeless nature of text editing, limiting continuous typing to strictly three events allows for a robust and clean implementation. Implementers will need tight bottlenecks to trap selection changes, key focus changes as well as changes from collaborative clients. While the above is not complete by any means, I hope readers will find it helpful.


# Listeners

Listeners are a mechanism that lets the Editor instance inform the user when a certain operation has occurred. All listeners follow a reactive pattern where you can do an operation upon something happening in the future. All listeners also return a function that easily allows for the
listener to be unregistered. Below are the different listeners that Lexical supports today:

## `registerUpdateListener`

Get notified when Lexical commits an update to the DOM.

```js
const removeUpdateListener = editor.registerUpdateListener(({editorState}) => {
  // The latest EditorState can be found as `editorState`.
  // To read the contents of the EditorState, use the following API:

  editorState.read(() => {
    // Just like editor.update(), .read() expects a closure where you can use
    // the $ prefixed helper functions.
  });
});

// Do not forget to unregister the listener when no longer needed!
removeUpdateListener();
```

The update listener callbacks receives a single argument containing the follow properties:

- `editorState` the latest updated Editor State
- `prevEditorState` the previous Editor State
- `tags` a Set of all tags that were passed to the update

One thing to be aware of is "waterfall" updates. This is where you might schedule an update inside an update
listener, as shown below:

```js
editor.registerUpdateListener(({editorState}) => {
  // Read the editorState and maybe get some value.
  editorState.read(() => {
    // ...
  });

  // Then schedule another update.
  editor.update(() => {
    // ...
  });
});
```

The problem with this pattern is that it means we end up doing two DOM updates, when we likely could have
done it in a single DOM update. This can have an impact on performance, which is important in a text editor.
To avoid this, we recommend looking into [Node Transforms](https://lexical.dev/docs/concepts/transforms), which allow you to listen to node changes and
transform them as part of the same given update, meaning no waterfalls!

## `registerTextContentListener`

Get notified when Lexical commits an update to the DOM and the text content of the editor changes from
the previous state of the editor. If the text content is the same between updates, no notifications to
the listeners will happen.

```js
const removeTextContentListener = editor.registerTextContentListener(
  (textContent) => {
    // The latest text content of the editor!
    console.log(textContent);
  },
);

// Do not forget to unregister the listener when no longer needed!
removeTextContentListener();
```

## `registerMutationListener`

Get notified when a specific type of Lexical node has been mutated. There are three states of mutation:

- `created`
- `destroyed`
- `updated`

Mutation listeners are great for tracking the lifecycle of specific types of node. They can be used to
handle external UI state and UI features relating to specific types of node.

If any existing nodes are in the DOM, and skipInitialization is not true, the listener
will be called immediately with an updateTag of 'registerMutationListener' where all
nodes have the 'created' NodeMutation. This can be controlled with the skipInitialization option
(whose default was previously true for backwards compatibility with &lt;=0.16.1 but has been changed to false as of 0.21.0).

```js
const removeMutationListener = editor.registerMutationListener(
  MyCustomNode,
  (mutatedNodes, { updateTags, dirtyLeaves, prevEditorState }) => {
    // mutatedNodes is a Map where each key is the NodeKey, and the value is the state of mutation.
    for (let [nodeKey, mutation] of mutatedNodes) {
      console.log(nodeKey, mutation)
    }
  },
  {skipInitialization: false}
);

// Do not forget to unregister the listener when no longer needed!
removeMutationListener();
```

## `registerEditableListener`

Get notified when the editor's mode has changed. The editor's mode can be changed
via `editor.setEditable(boolean)`.

```js
const removeEditableListener = editor.registerEditableListener(
  (editable) => {
    // The editor's mode is passed in!
    console.log(editable);
  },
);

// Do not forget to unregister the listener when no longer needed!
removeEditableListener();
```

## `registerDecoratorListener`

Get notified when the editor's decorator object changes. The decorator object contains
all `DecoratorNode` keys -> their decorated value. This is primarily used with external
UI frameworks.

```js
const removeDecoratorListener = editor.registerDecoratorListener(
  (decorators) => {
    // The editor's decorators object is passed in!
    console.log(decorators);
  },
);

// Do not forget to unregister the listener when no longer needed!
removeDecoratorListener();
```

## `registerRootListener`

Get notified when the editor's root DOM element (the content editable Lexical attaches to) changes. This is primarily used to
attach event listeners to the root element. *The root listener function is executed directly upon registration and then on any subsequent update.*

```js
const removeRootListener = editor.registerRootListener(
  (rootElement, prevRootElement) => {
   //add listeners to the new root element
   //remove listeners from the old root element
  },
);

// Do not forget to unregister the listener when no longer needed!
removeRootListener();
```


# Node Overrides / Node Replacements

Some of the most commonly used Lexical Nodes are owned and maintained by the core library. For example, ParagraphNode, HeadingNode, QuoteNode, List(Item)Node etc - these are all provided by Lexical packages, which provides an easier out-of-the-box experience for some editor features, but makes it difficult to override their behavior. For instance, if you wanted to change the behavior of ListNode, you would typically extend the class and override the methods. However, how would you tell Lexical to use *your* ListNode subclass in the ListPlugin instead of using the core ListNode? That's where Node Overrides can help.

Node Overrides allow you to replace all instances of a given node in your editor with instances of a different node class. This can be done through the nodes array in the Editor config:

```
const editorConfig = {
    ...
    nodes=[
        // Don't forget to register your custom node separately!
        CustomParagraphNode,
        {
            replace: ParagraphNode,
            with: (node: ParagraphNode) => {
                return new CustomParagraphNode();
            },
            withKlass: CustomParagraphNode,
        }
    ]
}
```
In the snippet above,
- `replace`: Specifies the core node type to be replaced. 
- `with`: Defines a transformation function to replace instances of the original node to the custom node.  
- `withKlass`: This option ensures that behaviors associated with the original node type work seamlessly with the replacement. For instance, node transforms or mutation listeners targeting ParagraphNode will also apply to CustomParagraphNode when withKlass is specified. Without this option, the custom node might not fully integrate with the editor's built-in features, leading to unexpected behavior.

Once this is done, Lexical will replace all ParagraphNode instances with CustomParagraphNode instances. One important use case for this feature is overriding the serialization behavior of core nodes. Check out the full example below.

<iframe src="https://codesandbox.io/embed/ecstatic-maxwell-kw5utu?fontsize=14&hidenavigation=1&module=/src/Editor.js,/src/plugins/CollapsiblePlugin.ts,/src/nodes/CollapsibleContainerNode.ts&theme=dark&view=split"
     style={{width:'100%', height:'700px', border:0, borderRadius:'4px', overflow:'hidden'}}
     title="lexical-collapsible-container-plugin-example"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"
></iframe>
# Nodes

## Base Nodes

Nodes are a core concept in Lexical. Not only do they form the visual editor view, as part of the `EditorState`, but they also represent the
underlying data model for what is stored in the editor at any given time. Lexical has a single core based node, called `LexicalNode` that
is extended internally to create Lexical's five base nodes:

- `RootNode`
- `LineBreakNode`
- `ElementNode`
- `TextNode`
- `DecoratorNode`

Of these nodes, three of them are exposed from the `lexical` package, making them ideal to be extended:

- `ElementNode`
- `TextNode`
- `DecoratorNode`

### [`RootNode`](https://github.com/facebook/lexical/blob/main/packages/lexical/src/nodes/LexicalRootNode.ts)

There is only ever a single `RootNode` in an `EditorState` and it is always at the top and it represents the
`contenteditable` itself. This means that the `RootNode` does not have a parent or siblings.

- To get the text content of the entire editor, you should use `rootNode.getTextContent()`.
- To avoid selection issues, Lexical forbids insertion of text nodes directly into a `RootNode`.
#### Semantics and Use Cases

The `RootNode` has specific characteristics and restrictions to maintain editor integrity:

1. **Non-extensibility**  
   The `RootNode` cannot be subclassed or replaced with a custom implementation. It is designed as a fixed part of the editor architecture.

2. **Exclusion from Mutation Listeners**  
   The `RootNode` does not participate in mutation listeners. Instead, use a root-level or update listener to observe changes at the document level.

3. **Compatibility with Node Transforms**  
   While the `RootNode` is not "part of the document" in the traditional sense, it can still appear to be in some cases, such as during serialization or when applying node transforms.

4. **Document-Level Metadata**  
   If you are attempting to use the `RootNode` for document-level metadata (e.g., undo/redo support), consider alternative designs. Currently, Lexical does not provide direct facilities for this use case, but solutions like creating a shadow root under the `RootNode` might work.

By design, the `RootNode` serves as a container for the editor's content rather than an active part of the document's logical structure. This approach simplifies operations like serialization and keeps the focus on content nodes.

### [`LineBreakNode`](https://github.com/facebook/lexical/blob/main/packages/lexical/src/nodes/LexicalLineBreakNode.ts)

You should never have `'\n'` in your text nodes, instead you should use the `LineBreakNode` which represents
`'\n'`, and more importantly, can work consistently between browsers and operating systems.

### [`ElementNode`](https://github.com/facebook/lexical/blob/main/packages/lexical/src/nodes/LexicalElementNode.ts)

Used as parent for other nodes, can be block level (`ParagraphNode`, `HeadingNode`) and inline (`LinkNode`).
Has various methods which define its behaviour that can be overridden during extension (`isInline`, `canBeEmpty`, `canInsertTextBefore` and more)

### [`TextNode`](https://github.com/facebook/lexical/blob/main/packages/lexical/src/nodes/LexicalTextNode.ts)

Leaf type of node that contains text. It also includes few text-specific properties:

- `format` any combination of `bold`, `italic`, `underline`, `strikethrough`, `code`, `subscript` and `superscript`
- `mode`
  - `token` - acts as immutable node, can't change its content and is deleted all at once
  - `segmented` - its content deleted by segments (one word at a time), it is editable although node becomes non-segmented once its content is updated
- `style` can be used to apply inline css styles to text

### [`DecoratorNode`](https://github.com/facebook/lexical/blob/main/packages/lexical/src/nodes/LexicalDecoratorNode.ts)

Wrapper node to insert arbitrary view (component) inside the editor. Decorator node rendering is framework-agnostic and
can output components from React, vanilla js or other frameworks.

## Node Properties

Lexical nodes can have properties. It's important that these properties are JSON serializable too, so you should never
be assigning a property to a node that is a function, Symbol, Map, Set, or any other object that has a different prototype
than the built-ins. `null`, `undefined`, `number`, `string`, `boolean`, `{}` and `[]` are all types of property that can be
assigned to node.

By convention, we prefix properties with `__` (double underscore) so that it makes it clear that these properties are private
and their access should be avoided directly. We opted for `__` instead of `_` because of the fact that some build tooling
mangles and minifies single `_` prefixed properties to improve code size. However, this breaks down if you're exposing a node
to be extended outside of your build.

If you are adding a property that you expect to be modifiable or accessible, then you should always create a set of `get*()`
and `set*()` methods on your node for this property. Inside these methods, you'll need to invoke some very important methods
that ensure consistency with Lexical's internal immutable system. These methods are `getWritable()` and `getLatest()`.

```js
import type {NodeKey} from 'lexical';

class MyCustomNode extends SomeOtherNode {
  __foo: string;

  constructor(foo: string, key?: NodeKey) {
    super(key);
    this.__foo = foo;
  }

  setFoo(foo: string) {
    // getWritable() creates a clone of the node
    // if needed, to ensure we don't try and mutate
    // a stale version of this node.
    const self = this.getWritable();
    self.__foo = foo;
  }

  getFoo(): string {
    // getLatest() ensures we are getting the most
    // up-to-date value from the EditorState.
    const self = this.getLatest();
    return self.__foo;
  }
}
```

Lastly, all nodes should have both a `static getType()` method and a `static clone()` method.
Lexical uses the type to be able to reconstruct a node back with its associated class prototype
during deserialization (important for copy + paste!). Lexical uses cloning to ensure consistency
between creation of new `EditorState` snapshots.

Expanding on the example above with these methods:

```js
class MyCustomNode extends SomeOtherNode {
  __foo: string;

  static getType(): string {
    return 'custom-node';
  }

  static clone(node: MyCustomNode): MyCustomNode {
    // If any state needs to be set after construction, it should be
    // done by overriding the `afterCloneFrom` instance method.
    return new MyCustomNode(node.__foo, node.__key);
  }

  constructor(foo: string, key?: NodeKey) {
    super(key);
    this.__foo = foo;
  }

  setFoo(foo: string) {
    // getWritable() creates a clone of the node
    // if needed, to ensure we don't try and mutate
    // a stale version of this node.
    const self = this.getWritable();
    self.__foo = foo;
  }

  getFoo(): string {
    // getLatest() ensures we are getting the most
    // up-to-date value from the EditorState.
    const self = this.getLatest();
    return self.__foo;
  }
}
```

## Creating custom nodes

As mentioned above, Lexical exposes three base nodes that can be extended.

> Did you know? Nodes such as `ElementNode` are already extended in the core by Lexical, such as `ParagraphNode` and `RootNode`!

### Extending `ElementNode`

Below is an example of how you might extend `ElementNode`:

```js
import {ElementNode, LexicalNode} from 'lexical';

export class CustomParagraph extends ElementNode {
  static getType(): string {
    return 'custom-paragraph';
  }

  static clone(node: CustomParagraph): CustomParagraph {
    return new CustomParagraph(node.__key);
  }

  createDOM(): HTMLElement {
    // Define the DOM element here
    const dom = document.createElement('p');
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    // Returning false tells Lexical that this node does not need its
    // DOM element replacing with a new copy from createDOM.
    return false;
  }
}
```

It's also good etiquette to provide some `$` prefixed utility functions for
your custom `ElementNode` so that others can easily consume and validate nodes
are that of your custom node. Here's how you might do this for the above example:

```js
export function $createCustomParagraphNode(): CustomParagraph {
  return new CustomParagraph();
}

export function $isCustomParagraphNode(node: LexicalNode | null | undefined): node is CustomParagraph  {
  return node instanceof CustomParagraph;
}
```

### Extending `TextNode`

```js
export class ColoredNode extends TextNode {
  __color: string;

  constructor(text: string, color: string, key?: NodeKey): void {
    super(text, key);
    this.__color = color;
  }

  static getType(): string {
    return 'colored';
  }

  static clone(node: ColoredNode): ColoredNode {
    return new ColoredNode(node.__text, node.__color, node.__key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    element.style.color = this.__color;
    return element;
  }

  updateDOM(
    prevNode: this,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    const isUpdated = super.updateDOM(prevNode, dom, config);
    if (prevNode.__color !== this.__color) {
      dom.style.color = this.__color;
    }
    return isUpdated;
  }
}

export function $createColoredNode(text: string, color: string): ColoredNode {
  return new ColoredNode(text, color);
}

export function $isColoredNode(node: LexicalNode | null | undefined): node is ColoredNode {
  return node instanceof ColoredNode;
}
```

### Extending `DecoratorNode`

```ts
export class VideoNode extends DecoratorNode<ReactNode> {
  __id: string;

  static getType(): string {
    return 'video';
  }

  static clone(node: VideoNode): VideoNode {
    return new VideoNode(node.__id, node.__key);
  }

  constructor(id: string, key?: NodeKey) {
    super(key);
    this.__id = id;
  }

  createDOM(): HTMLElement {
    return document.createElement('div');
  }

  updateDOM(): false {
    return false;
  }

  decorate(): ReactNode {
    return <VideoPlayer videoID={this.__id} />;
  }
}

export function $createVideoNode(id: string): VideoNode {
  return new VideoNode(id);
}

export function $isVideoNode(
  node: LexicalNode | null | undefined,
): node is VideoNode {
  return node instanceof VideoNode;
}
```

Using `useDecorators`, `PlainTextPlugin` and `RichTextPlugin` executes `React.createPortal(reactDecorator, element)` for each `DecoratorNode`,
where the `reactDecorator` is what is returned by `DecoratorNode.prototype.decorate`,
and the `element` is an `HTMLElement` returned by `DecoratorNode.prototype.createDOM`.
# Lexical Plugins

React-based plugins are using Lexical editor instance from `<LexicalComposer>` context:

```js
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {PlainTextPlugin} from '@lexical/react/LexicalPlainTextPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
```

```jsx
const initialConfig = {
  namespace: 'MyEditor',
  theme,
  onError,
};

<LexicalComposer initialConfig={initialConfig}>
  <PlainTextPlugin
    contentEditable={<ContentEditable />}
    placeholder={<div>Enter some text...</div>}
  />
  <HistoryPlugin />
  <OnChangePlugin onChange={onChange} />
  ...
</LexicalComposer>;
```

> Note: Many plugins might require you to register the one or many Lexical nodes in order for the plugin to work. You can do this by passing a reference to the node to the `nodes` array in your initial editor configuration.

```jsx
const initialConfig = {
  namespace: 'MyEditor',
  theme,
  nodes: [ListNode, ListItemNode], // Pass the references to the nodes here
  onError,
};
```

### `LexicalPlainTextPlugin`

React wrapper for `@lexical/plain-text` that adds major features for plain text editing, including typing, deletion and copy/pasting.

```jsx
<PlainTextPlugin
  contentEditable={<ContentEditable />}
  placeholder={<div>Enter some text...</div>}
  ErrorBoundary={LexicalErrorBoundary}
/>
```

### `LexicalRichTextPlugin`

React wrapper for `@lexical/rich-text` that adds major features for rich text editing, including typing, deletion, copy/pasting, indent/outdent and bold/italic/underline/strikethrough text formatting.

```jsx
<RichTextPlugin
  contentEditable={<ContentEditable />}
  placeholder={<div>Enter some text...</div>}
  ErrorBoundary={LexicalErrorBoundary}
/>
```

### `LexicalOnChangePlugin`

Plugin that calls `onChange` whenever Lexical state is updated. Using `ignoreHistoryMergeTagChange` (`true` by default) and `ignoreSelectionChange` (`false` by default) can give more granular control over changes that are causing `onChange` call.

```jsx
<OnChangePlugin onChange={onChange} />
```

### `LexicalHistoryPlugin`

React wrapper for `@lexical/history` that adds support for history stack management and `undo` / `redo` commands.

```jsx
<HistoryPlugin />
```

### `LexicalLinkPlugin`

React wrapper for `@lexical/link` that adds support for links, including `$toggleLink` command support that toggles link for selected text.

```jsx
<LinkPlugin />
```

### `LexicalListPlugin`

React wrapper for `@lexical/list` that adds support for lists (ordered and unordered)

```jsx
<ListPlugin />
```

### `LexicalCheckListPlugin`

React wrapper for `@lexical/list` that adds support for check lists. Note that it requires some css to render check/uncheck marks. See PlaygroundEditorTheme.css for details.

```jsx
<CheckListPlugin />
```

### `LexicalTablePlugin`

[![See API Documentation](/img/see-api-documentation.svg)](/docs/api/modules/lexical_react_LexicalTablePlugin)

React wrapper for `@lexical/table` that adds support for tables.

```jsx
<TablePlugin />
```

### `LexicalTabIndentationPlugin`

Plugin that allows tab indentation in combination with `@lexical/rich-text`.

```jsx
<TabIndentationPlugin />
```

### `LexicalAutoLinkPlugin`

Plugin will convert text into links based on passed matchers list. In example below whenever user types url-like string it will automaticaly convert it into a link node

```jsx
const URL_MATCHER =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

const MATCHERS = [
  (text) => {
    const match = URL_MATCHER.exec(text);
    if (match === null) {
      return null;
    }
    const fullMatch = match[0];
    return {
      index: match.index,
      length: fullMatch.length,
      text: fullMatch,
      url: fullMatch.startsWith('http') ? fullMatch : `https://${fullMatch}`,
      // attributes: { rel: 'noreferrer', target: '_blank' }, // Optional link attributes
    };
  },
];

...

<AutoLinkPlugin matchers={MATCHERS} />
```

### `LexicalClearEditorPlugin`

Adds `clearEditor` command support to clear editor's content.

```jsx
<ClearEditorPlugin />
```

### `LexicalMarkdownShortcutPlugin`

Adds markdown shortcut support: headings, lists, code blocks, quotes, links and inline styles (bold, italic, strikethrough).

```jsx
<MarkdownShortcutPlugin />
```

### `LexicalTableOfContentsPlugin`

This plugin allows you to render a table of contents for a page from the headings from the editor. It listens to any deletions or modifications to those headings and updates the table of contents. Additionally, it's able to track any newly added headings and inserts them in the table of contents once they are created. This plugin also supports lazy loading - so you can defer adding the plugin until when the user needs it.

In order to use `TableOfContentsPlugin`, you need to pass a callback function in its children. This callback function gives you access to the up-to-date data of the table of contents. You can access this data through a single parameter for the callback which comes in the form of an array of arrays `[[headingKey, headingTextContent, headingTag], [], [], ...]`

`headingKey`: Unique key that identifies the heading.
`headingTextContent`: A string of the exact text of the heading.
`headingTag`: A string that reads either 'h1', 'h2', or 'h3'.

```jsx
<TableOfContentsPlugin>
  {(tableOfContentsArray) => {
    return (
      <MyCustomTableOfContentsPlugin tableOfContents={tableOfContentsArray} />
    );
  }}
</TableOfContentsPlugin>
```

### `LexicalEditorRefPlugin`

Allows you to get a ref to the underlying editor instance outside of LexicalComposer, which is convenient when you want to interact with the editor
from a separate part of your application.

```jsx
const editorRef = useRef(null);
<EditorRefPlugin editorRef={editorRef} />;
```

### `LexicalSelectionAlwaysOnDisplay`

By default, browser text selection becomes invisible when clicking away from the editor. This plugin ensures the selection remains visible.

```jsx
<SelectionAlwaysOnDisplay />
```
---
sidebar_position: 1
---

# Quick Start (Vanilla JS)

This section covers how to use Lexical, independently of any framework or library. For those intending to use Lexical in their React applications,
it's advisable to [check out the Getting Started with React page](https://lexical.dev/docs/getting-started/react).

### Creating an editor and using it

When you work with Lexical, you normally work with a single editor instance. An editor instance can be thought of as the one responsible
for wiring up an `EditorState` with the DOM. The editor is also the place where you can register custom nodes, add listeners, and transforms.

An editor instance can be created from the `lexical` package and accepts an optional configuration object that allows for theming and other options:

```js
import {createEditor} from 'lexical';

const config = {
  namespace: 'MyEditor',
  theme: {
    ...
  },
  onError: console.error
};

const editor = createEditor(config);
```

Once you have an editor instance, when ready, you can associate the editor instance with a content editable `<div>` element in your document:

```js
const contentEditableElement = document.getElementById('editor');

editor.setRootElement(contentEditableElement);
```

If you want to clear the editor instance from the element, you can pass `null`. Alternatively, you can switch to another element if need be,
just pass an alternative element reference to `setRootElement()`.

### Working with Editor States

With Lexical, the source of truth is not the DOM, but rather an underlying state model
that Lexical maintains and associates with an editor instance. You can get the latest
editor state from an editor by calling `editor.getEditorState()`.

Editor states are serializable to JSON, and the editor instance provides a useful method
to deserialize stringified editor states.

```js
const stringifiedEditorState = JSON.stringify(editor.getEditorState().toJSON());

const newEditorState = editor.parseEditorState(stringifiedEditorState);
```

### Updating an editor state

While it's not necessarily needed if using `@lexical/rich-text` or `@lexical/plain-text` helper packages, it's still relevant for programmatic content modification as well as in case of the custom editor fine tuning.

There are a few ways to update an editor instance:

- Trigger an update with `editor.update()`
- Setting the editor state via `editor.setEditorState()`
- Applying a change as part of an existing update via `editor.registerNodeTransform()`
- Using a command listener with `editor.registerCommand(EXAMPLE_COMMAND, () => {...}, priority)`

The most common way to update the editor is to use `editor.update()`. Calling this function
requires a function to be passed in that will provide access to mutate the underlying
editor state. When starting a fresh update, the current editor state is cloned and
used as the starting point. From a technical perspective, this means that Lexical leverages a technique
called double-buffering during updates. There's an editor state to represent what is current on
the screen, and another work-in-progress editor state that represents future changes.

Creating an update is typically an async process that allows Lexical to batch multiple updates together in
a single update – improving performance. When Lexical is ready to commit the update to
the DOM, the underlying mutations and changes in the update will form a new immutable
editor state. Calling `editor.getEditorState()` will then return the latest editor state
based on the changes from the update.

Here's an example of how you can update an editor instance:

```js
import {$getRoot, $getSelection, $createParagraphNode, $createTextNode} from 'lexical';

// Inside the `editor.update` you can use special $ prefixed helper functions.
// These functions cannot be used outside the closure, and will error if you try.
// (If you're familiar with React, you can imagine these to be a bit like using a hook
// outside of a React function component).
editor.update(() => {
  // Get the RootNode from the EditorState
  const root = $getRoot();

  // Get the selection from the EditorState
  const selection = $getSelection();

  // Create a new ParagraphNode
  const paragraphNode = $createParagraphNode();

  // Create a new TextNode
  const textNode = $createTextNode('Hello world');

  // Append the text node to the paragraph
  paragraphNode.append(textNode);

  // Finally, append the paragraph to the root
  root.append(paragraphNode);
});
```
**It's important to note that the core library (the 'lexical' package) does not listen for any commands or perform any updates to the editor state in response to user events out-of-the-box.** In order to see text and other content appear in the editor, you need to register [command listeners](https://lexical.dev/docs/concepts/commands#editorregistercommand) and update the editor in the callback. Lexical provides a couple of helper packages to make it easy to wire up a lot of the basic commands you might want for [plain text](https://lexical.dev/docs/packages/lexical-plain-text) or [rich text](https://lexical.dev/docs/packages/lexical-rich-text) experiences.

If you want to know when the editor updates so you can react to the changes, you can add an update
listener to the editor, as shown below:

```js
editor.registerUpdateListener(({editorState}) => {
  // The latest EditorState can be found as `editorState`.
  // To read the contents of the EditorState, use the following API:

  editorState.read(() => {
    // Just like editor.update(), .read() expects a closure where you can use
    // the $ prefixed helper functions.
  });
});
```

### Putting it together

Here we have simplest Lexical setup in rich text configuration (`@lexical/rich-text`) with history (`@lexical/history`) and accessibility (`@lexical/dragon`) features enabled.

<iframe width="100%" height="400" src="https://stackblitz.com/github/facebook/lexical/tree/main/examples/vanilla-js?embed=1&file=src%2Fmain.ts&terminalHeight=0&ctl=1" sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"></iframe>
---
sidebar_position: 2
---

# Getting Started with React

## Video Tutorials

For a detailed walkthrough of setting up a basic editor with Lexical in React, check out these videos:

* [Getting Started with Lexical & React](https://www.youtube.com/watch?v=qIqxvk2qcmo)
* [Themes, Nodes, and Rich Text](https://www.youtube.com/watch?v=pIBUFYd9zJY)
* [Headings, Lists, Toolbar](https://www.youtube.com/watch?v=5sRh_WXw0WI)
* [Creating Nodes and Plugins](https://www.youtube.com/watch?v=abZNazybzvs)

Keep in mind that some of these videos may be partially outdated as we do not update them as often as textual documentation.

## Creating Basic Rich Text Editor

To simplify Lexical integration with React we provide the `@lexical/react` package that wraps Lexical APIs with React components so the editor itself as well as all the plugins now can be easily composed using JSX.
Furthermore, you can lazy load plugins if desired, so you don't pay the cost for plugins until you actually use them.

To start, install `lexical` and `@lexical/react`:

```
npm install --save lexical @lexical/react
```

Below is an example of a basic rich text editor using `lexical` and `@lexical/react`.

```jsx
import {$getRoot, $getSelection} from 'lexical';
import {useEffect} from 'react';

import {AutoFocusPlugin} from '@lexical/react/LexicalAutoFocusPlugin';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';

const theme = {
  // Theme styling goes here
  //...
}

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
function onError(error) {
  console.error(error);
}

function Editor() {
  const initialConfig = {
    namespace: 'MyEditor',
    theme,
    onError,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable />}
        placeholder={<div>Enter some text...</div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <AutoFocusPlugin />
    </LexicalComposer>
  );
}
```

## Adding UI to control text formatting

Out of the box Lexical doesn't provide any type of UI as it's not a ready to use editor but rather a framework for creation of your own editor.
Below you can find an example of the integration from the previous chapter that now features 2 new plugins:
- `ToolbarPlugin` - renders UI to control text formatting
- `TreeViewPlugin` - renders debug view below the editor so we can see its state in real time

However no UI can be created w/o CSS and Lexical is not an exception here. Pay attention to `ExampleTheme.ts` and how it's used in this example, with corresponding styles defined in `styles.css`.

<iframe width="100%" height="400" src="https://stackblitz.com/github/facebook/lexical/tree/main/examples/react-rich?embed=1&file=src%2FApp.tsx&terminalHeight=0&ctl=1" sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"></iframe>


## Saving Lexical State

:::tip
While we attempt to write our own plugin here for demonstration purposes, in real life projects it's better to opt for [LexicalOnChangePlugin](/docs/react/plugins#lexicalonchangeplugin).
:::

Now that we have a simple editor in React, the next thing we might want to do is access the content of the editor to, for instance,
save it in a database. We can do this via the an [update listener](https://lexical.dev/docs/concepts/listeners#registerupdatelistener), which will execute every time the editor state changes and provide us with the latest state. In React, we typically use the plugin system to set up listeners like this, since it provides us easy access to the LexicalEditor instance via a React Context. So, let's write our own plugin that notifies us when the editor updates.

```jsx
// When the editor changes, you can get notified via the
// OnChangePlugin!
function MyOnChangePlugin({ onChange }) {
  // Access the editor through the LexicalComposerContext
  const [editor] = useLexicalComposerContext();
  // Wrap our listener in useEffect to handle the teardown and avoid stale references.
  useEffect(() => {
    // most listeners return a teardown function that can be called to clean them up.
    return editor.registerUpdateListener(({editorState}) => {
      // call onChange here to pass the latest state up to the parent.
      onChange(editorState);
    });
  }, [editor, onChange]);
  return null;
}
```

Now, we can implement this in our editor and save the EditorState in a React state variable:

```jsx
function MyOnChangePlugin({ onChange }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerUpdateListener(({editorState}) => {
      onChange(editorState);
    });
  }, [editor, onChange]);
  return null;
}

function Editor() {
  // ...

  const [editorState, setEditorState] = useState();
  function onChange(editorState) {
    setEditorState(editorState);
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable />}
        placeholder={<div>Enter some text...</div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <MyCustomAutoFocusPlugin />
      <MyOnChangePlugin onChange={onChange}/>
    </LexicalComposer>
  );
}

```
Ok, so now we're saving the EditorState object in a React state variable, but we can't save a JavaScript object to our database - so how do we persist the state so we can load it later? We need to serialize it to a storage format. For this purpose (among others) Lexical provides several serialization APIs that convert EditorState to a string that can be sent over the network and saved to a database. Building on our previous example, we can do that this way:

```jsx
function MyOnChangePlugin({ onChange }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerUpdateListener(({editorState}) => {
      onChange(editorState);
    });
  }, [editor, onChange]);
  return null;
}

function Editor() {
  // ...

  const [editorState, setEditorState] = useState();
  function onChange(editorState) {
    // Call toJSON on the EditorState object, which produces a serialization safe string
    const editorStateJSON = editorState.toJSON();
    // However, we still have a JavaScript object, so we need to convert it to an actual string with JSON.stringify
    setEditorState(JSON.stringify(editorStateJSON));
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      {/*...*/}
      <MyOnChangePlugin onChange={onChange}/>
    </LexicalComposer>
  );

```

From there, it's straightforward to wire up a submit button or some other UI trigger that will take the state from the React state variable and send it to a server for storage in a database.

One important thing to note: Lexical is generally meant to be uncontrolled, so avoid trying to pass the EditorState back into Editor.setEditorState or something along those lines.


# Read Mode / Edit Mode

Lexical supports two modes:

- Read mode
- Edit mode

The default behavior for Lexical is edit mode, or more accurately not read only mode. Under-the-hood, the main
implementation detail is that the `contentEditable` is being set to `"false"` or `"true"` depending on the mode.
Specific plugins can listen to the mode change too – allowing them to customize parts of the UI depending on the
mode.

## Setting the mode

In order to set the mode, this can be done on creation of the editor:

```js
const editor = createEditor({
  editable: true,
  ...
})
```

If you're using `@lexical/react` this can be done on the `initialConfig` passed to `<LexicalComposer>`:

```jsx
<LexicalComposer initialConfig={{editable: true}}>
  ...
</LexicalComposer>
```

After an editor is created, the mode can be changed imperatively:

```js
editor.setEditable(true);
```

## Reading the mode

In order to find the current mode of the editor you can use:

```js
const isEditable = editor.isEditable(); // Returns true or false
```

You can also get notified when the editor's read only mode has changed:

```js
const removeEditableListener = editor.registerEditableListener(
  (isEditable) => {
    // The editor's mode is passed in!
    console.log(isEditable);
  },
);

// Do not forget to unregister the listener when no longer needed!
removeEditableListener();
```


# Selection

## Types of selection

Lexical's selection is part of the `EditorState`. This means that for every update, or change to the editor, the
selection always remains consistent with that of the `EditorState`'s node tree.

In Lexical, there are four types of selection possible:

- `RangeSelection`
- `NodeSelection`
- `TableSelection` (implemented in `@lexical/table`)
- `null`

It is possible, but not generally recommended, to implement your own selection types that implement `BaseSelection`.

### `RangeSelection`

This is the most common type of selection, and is a normalization of the browser's DOM Selection and Range APIs.
`RangeSelection` consists of three main properties:

- `anchor` representing a `RangeSelection` point
- `focus` representing a `RangeSelection` point
- `format` numeric bitwise flag, representing any active text formats

Both the `anchor` and `focus` points refer to an object that represents a specific part of the editor. The main properties of a `RangeSelection` point are:

- `key` representing the `NodeKey` of the selected Lexical node
- `offset` representing the position from within its selected Lexical node. For the `text` type this is the character, and for the `element` type this is the child index from within the `ElementNode`
- `type` representing either `element` or `text`.

### `NodeSelection`

NodeSelection represents a selection of multiple arbitrary nodes. For example, three images selected at the same time.

- `getNodes()` returns an array containing the selected LexicalNodes

### `TableSelection`

TableSelection represents a grid-like selection like tables. It stores the key of the parent node where the selection takes place and the start and end points.
`TableSelection` consists of three main properties:

- `tableKey` representing the parent node key where the selection takes place
- `anchor` representing a `TableSelection` point
- `focus` representing a `TableSelection` point

For example, a table where you select row = 1 col = 1 to row 2 col = 2 could be stored as follows:
- `tableKey = 2` table key
- `anchor = 4` table cell (key may vary)
- `focus = 10` table cell (key may vary)

Note that `anchor` and `focus` points work the same way as `RangeSelection`.

### `null`

This is for when the editor doesn't have any active selection. This is common for when the editor has been blurred or when selection
has moved to another editor on the page. This can also happen when trying to select non-editable components within the editor space.

## Working with selection

Selection can be found using the `$getSelection()` helper, exported from the `lexical` package. This function can be used within
an update, a read, or a command listener.

```js
import {$getSelection, SELECTION_CHANGE_COMMAND} from 'lexical';

editor.update(() => {
  const selection = $getSelection();
});

editorState.read(() => {
  const selection = $getSelection();
});

// SELECTION_CHANGE_COMMAND fires when selection changes within a Lexical editor.
editor.registerCommand(SELECTION_CHANGE_COMMAND, () => {
  const selection = $getSelection();
});
```

In some cases you might want to create a new type of selection and set the editor selection to
be that. This can only be done in update or command listeners.

```js
import {$setSelection, $createRangeSelection, $createNodeSelection} from 'lexical';

editor.update(() => {
  // Set a range selection
  const rangeSelection = $createRangeSelection();
  $setSelection(rangeSelection);

  // You can also indirectly create a range selection, by calling some of the selection
  // methods on Lexical nodes.
  const someNode = $getNodeByKey(someKey);

  // On element nodes, this will create a RangeSelection with type "element",
  // referencing an offset relating to the child within the element.
  // On text nodes, this will create a RangeSelection with type "text",
  // referencing the text character offset.
  someNode.select();
  someNode.selectPrevious();
  someNode.selectNext();

  // You can use this on any node.
  someNode.selectStart();
  someNode.selectEnd();

  // Set a node selection
  const nodeSelection = $createNodeSelection();
  // Add a node key to the selection.
  nodeSelection.add(someKey);
  $setSelection(nodeSelection);

  // You can also clear selection by setting it to `null`.
  $setSelection(null);
});
```

## Focus

You may notice that when you issue an `editor.update` or
`editor.dispatchCommand` then the editor can "steal focus" if there is
a selection and the editor is editable. This is because the Lexical
selection is reconciled to the DOM selection during reconciliation,
and the browser's focus follows its DOM selection.

If you want to make updates or dispatch commands to the editor without
changing the selection, can use the `'skip-dom-selection'` update tag
(added in v0.22.0):

```js
// Call this from an editor.update or command listener
$addUpdateTag('skip-dom-selection');
```

If you want to add this tag during processing of a `dispatchCommand`,
you can wrap it in an `editor.update`:

```js
// NOTE: If you are already in a command listener or editor.update,
//       do *not* nest a second editor.update! Nested updates have
//       confusing semantics (dispatchCommand will re-use the
//       current update without nesting)
editor.update(() => {
  $addUpdateTag('skip-dom-selection');
  editor.dispatchCommand(/* … */);
});
```

If you have to support older versions of Lexical, you can mark the editor
as not editable during the update or dispatch.

```js
// NOTE: This code should be *outside* of your update or command listener, e.g.
//       directly in the DOM event listener
const prevEditable = editor.isEditable();
editor.setEditable(false);
editor.update(
  () => {
    // run your update code or editor.dispatchCommand in here
  }, {
    onUpdate: () => {
      editor.setEditable(prevEditable);
    },
  },
);
```


# Serialization & Deserialization

Internally, Lexical maintains the state of a given editor in memory, updating it in response to user inputs. Sometimes, it's useful to convert this state into a serialized format in order to transfer it between editors or store it for retrieval at some later time. In order to make this process easier, Lexical provides some APIs that allow Nodes to specify how they should be represented in common serialized formats.


## HTML

Currently, HTML serialization is primarily used to transfer data between Lexical and non-Lexical editors (such as Google Docs or Quip) via the copy & paste functionality in [`@lexical/clipboard`](https://github.com/facebook/lexical/blob/main/packages/lexical-clipboard/README.md), but we also offer generic utilities for converting `Lexical` -> `HTML` and `HTML` -> `Lexical` in our [`@lexical/html`](https://github.com/facebook/lexical/blob/main/packages/lexical-html/README.md) package.

### Lexical -> HTML
When generating HTML from an editor you can pass in a selection object to narrow it down to a certain section or pass in null to convert the whole editor.
```js
import {$generateHtmlFromNodes} from '@lexical/html';

const htmlString = $generateHtmlFromNodes(editor, selection | null);
```

#### `LexicalNode.exportDOM()`
You can control how a `LexicalNode` is represented as HTML by adding an `exportDOM()` method.

```js
exportDOM(editor: LexicalEditor): DOMExportOutput
```

When transforming an editor state into HTML, we simply traverse the current editor state (or the selected subset thereof) and call the `exportDOM` method for each Node in order to convert it to an `HTMLElement`.

Sometimes, it's necessary or useful to do some post-processing after a node has been converted to HTML. For this, we expose the "after" API on `DOMExportOutput`, which allows `exportDOM` to specify a function that should be run after the conversion to an `HTMLElement` has happened.

```js
export type DOMExportOutput = {
  after?: (generatedElement: ?HTMLElement) => ?HTMLElement,
  element?: HTMLElement | null,
};
```

If the element property is null in the return value of exportDOM, that Node will not be represented in the serialized output.

### HTML -> Lexical

```js
import {$generateNodesFromDOM} from '@lexical/html';

editor.update(() => {
  // In the browser you can use the native DOMParser API to parse the HTML string.
  const parser = new DOMParser();
  const dom = parser.parseFromString(htmlString, textHtmlMimeType);

  // Once you have the DOM instance it's easy to generate LexicalNodes.
  const nodes = $generateNodesFromDOM(editor, dom);

  // Select the root
  $getRoot().select();

  // Insert them at a selection.
  $insertNodes(nodes);
});
```

If you are running in headless mode, you can do it this way using JSDOM:

```js
import {createHeadlessEditor} from '@lexical/headless';
import {$generateNodesFromDOM} from '@lexical/html';

// Once you've generated LexicalNodes from your HTML you can now initialize an editor instance with the parsed nodes.
const editorNodes = [] // Any custom nodes you register on the editor
const editor = createHeadlessEditor({ ...config, nodes: editorNodes });

editor.update(() => {
  // In a headless environment you can use a package such as JSDom to parse the HTML string.
  const dom = new JSDOM(htmlString);

  // Once you have the DOM instance it's easy to generate LexicalNodes.
  const nodes = $generateNodesFromDOM(editor, dom.window.document);

  // Select the root
  $getRoot().select();

  // Insert them at a selection.
  const selection = $getSelection();
  selection.insertNodes(nodes);
});
```

:::tip

Remember that state updates are asynchronous, so executing `editor.getEditorState()` immediately afterwards might not return the expected content. To avoid it, [pass `discrete: true` in the `editor.update` method](https://dio.la/article/lexical-state-updates#discrete-updates).

:::

#### `LexicalNode.importDOM()`
You can control how an `HTMLElement` is represented in `Lexical` by adding an `importDOM()` method to your `LexicalNode`.

```js
static importDOM(): DOMConversionMap | null;
```
The return value of `importDOM` is a map of the lower case (DOM) [Node.nodeName](https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeName) property to an object that specifies a conversion function and a priority for that conversion. This allows `LexicalNodes` to specify which type of DOM nodes they can convert and what the relative priority of their conversion should be. This is useful in cases where a DOM Node with specific attributes should be interpreted as one type of `LexicalNode`, and otherwise it should be represented as another type of `LexicalNode`.

```ts
type DOMConversionMap = Record<
  string,
  (node: HTMLElement) => DOMConversion | null
>;

type DOMConversion = {
  conversion: DOMConversionFn;
  priority: 0 | 1 | 2 | 3 | 4;
};

type DOMConversionFn = (element: HTMLElement) => DOMConversionOutput | null;

type DOMConversionOutput = {
  after?: (childLexicalNodes: Array<LexicalNode>) => Array<LexicalNode>;
  forChild?: DOMChildConversion;
  node: null | LexicalNode | Array<LexicalNode>;
};

type DOMChildConversion = (
  lexicalNode: LexicalNode,
  parentLexicalNode: LexicalNode | null | undefined,
) => LexicalNode | null | undefined;
```

@lexical/code provides a good example of the usefulness of this design. GitHub uses HTML ```<table>``` elements to represent the structure of copied code in HTML. If we interpreted all HTML ```<table>``` elements as literal tables, then code pasted from GitHub would appear in Lexical as a Lexical TableNode. Instead, CodeNode specifies that it can handle ```<table>``` elements too:

```js
class CodeNode extends ElementNode {
...
static importDOM(): DOMConversionMap | null {
  return {
    ...
    table: (node: Node) => {
      if (isGitHubCodeTable(node as HTMLTableElement)) {
        return {
          conversion: convertTableElement,
          priority: 3,
        };
      }
      return null;
    },
    ...
  };
}
...
}
```

If the imported ```<table>``` doesn't align with the expected GitHub code HTML, then we return null and allow the node to be handled by lower priority conversions.

Much like `exportDOM`, `importDOM` exposes APIs to allow for post-processing of converted Nodes. The conversion function returns a `DOMConversionOutput` which can specify a function to run for each converted child (forChild) or on all the child nodes after the conversion is complete (after). The key difference here is that ```forChild``` runs for every deeply nested child node of the current node, whereas ```after``` will run only once after the transformation of the node and all its children is complete. 

## JSON

### Lexical -> JSON
To generate a JSON snapshot from an `EditorState`, you can call the `toJSON()` method on the `EditorState` object.

```js
const editorState = editor.getEditorState();
const json = editorState.toJSON();
```

Alternatively, if you are trying to generate a stringified version of the `EditorState`, you can simply using `JSON.stringify` directly:

```js
const editorState = editor.getEditorState();
const jsonString = JSON.stringify(editorState);
```

#### `LexicalNode.exportJSON()`

You can control how a `LexicalNode` is represented as JSON by adding an `exportJSON()` method. It's important that you extend the serialization of the superclass by invoking `super`: e.g. `{ ...super.exportJSON(), /* your other properties */ }`.

```js
export type SerializedLexicalNode = {
  type: string;
  version: number;
};

exportJSON(): SerializedLexicalNode
```

When transforming an editor state into JSON, we simply traverse the current editor state and call the `exportJSON` method for each Node in order to convert it to a `SerializedLexicalNode` object that represents the JSON object for the given node. The built-in nodes from Lexical already have a JSON representation defined, but you'll need to define ones for your own custom nodes.

Here's an example of `exportJSON` for the `HeadingNode`:

```js
export type SerializedHeadingNode = Spread<
  {
    tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  },
  SerializedElementNode
>;

exportJSON(): SerializedHeadingNode {
  return {
    ...super.exportJSON(),
    tag: this.getTag(),
  };
}
```

#### `LexicalNode.importJSON()`

You can control how a `LexicalNode` is deserialized back into a node from JSON by adding an `importJSON()` method.

```js
export type SerializedLexicalNode = {
  type: string;
  version: number;
};

importJSON(jsonNode: SerializedLexicalNode): LexicalNode
```

This method works in the opposite way to how `exportJSON` works. Lexical uses the `type` field on the JSON object to determine what Lexical node class it needs to map to, so keeping the `type` field consistent with the `getType()` of the LexicalNode is essential.

You should use the `updateFromJSON` method in your `importJSON` to simplify the implementation and allow for future extension by the base classes.

Here's an example of `importJSON` for the `HeadingNode`:

```ts
static importJSON(serializedNode: SerializedHeadingNode): HeadingNode {
  return $createHeadingNode().updateFromJSON(serializedNode);
}

updateFromJSON(
  serializedNode: LexicalUpdateJSON<SerializedHeadingNode>,
): this {
  return super.updateFromJSON(serializedNode).setTag(serializedNode.tag);
}
```

#### `LexicalNode.updateFromJSON()`

`updateFromJSON` is a method introduced in Lexical 0.23 to simplify the implementation of `importJSON`, so that a base class can expose the code that it is using to set all of the node's properties based on the JSON to any subclass.

:::note

The input type used in this method is not sound in the general case, but it is safe if subclasses only add optional properties to the JSON. Even though it is not sound, the usage in this library is safe as long as your `importJSON` method does not upcast the node before calling `updateFromJSON`.

```ts
export type SerializedExtendedTextNode = Spread<
  // UNSAFE. This property is not optional
  { newProperty: string },
  SerializedTextNode
>;
```

```ts
export type SerializedExtendedTextNode = Spread<
  // SAFE. This property is not optional
  { newProperty?: string },
  SerializedTextNode
>;
```

This is because it's possible to cast to a more general type, e.g.

```ts
const serializedNode: SerializedTextNode = { /* ... */ };
const newNode: TextNode = $createExtendedTextNode();
// This passes the type check, but would fail at runtime if the updateFromJSON method required newProperty
newNode.updateFromJSON(serializedNode);
```

:::

### Versioning & Breaking Changes

It's important to note that you should avoid making breaking changes to existing fields in your JSON object, especially if backwards compatibility is an important part of your editor. That's why we recommend using a version field to separate the different changes in your node as you add or change functionality of custom nodes. Here's the serialized type definition for Lexical's base `TextNode` class:

```ts
import type {Spread} from 'lexical';

// Spread is a Typescript utility that allows us to spread the properties
// over the base SerializedLexicalNode type.
export type SerializedTextNode = Spread<
  {
    detail: number;
    format: number;
    mode: TextModeType;
    style: string;
    text: string;
  },
  SerializedLexicalNode
>;
```

If we wanted to make changes to the above `TextNode`, we should be sure to not remove or change an existing property, as this can cause data corruption. Instead, opt to add the functionality as a new optional property field instead.

```ts
export type SerializedTextNode = Spread<
  {
    detail: number;
    format: number;
    mode: TextModeType;
    style: string;
    text: string;
    // Our new field we've added
    newField?: string,
  },
  SerializedLexicalNode
>;
```

### Dangers of a flat version property

The `updateFromJSON` method should ignore `type` and `version`, to support subclassing and code re-use. Ideally, you should only evolve your types in a backwards compatible way (new fields are optional), and/or have a uniquely named property to store the version in your class. Generally speaking, it's best if nearly all properties are optional and the node provides defaults for each property. This allows you to write less boilerplate code and produce smaller JSON.

The reason that `version` is no longer recommended is that it does not compose with subclasses. Consider this hierarchy:

```ts
class TextNode {
  exportJSON() {
    return { /* ... */, version: 1 };
  }
}
class ExtendedTextNode extends TextNode {
  exportJSON() {
    return { ...super.exportJSON() };
  }
}
```

If `TextNode` is updated to `version: 2` then this version and new serialization will propagate to `ExtendedTextNode` via the `super.exportJSON()` call, but this leaves nowhere to store a version for `ExtendedTextNode` or vice versa. If the `ExtendedTextNode` explicitly specified a `version`, then the version of the base class will be ignored even though the representation of the JSON from the base class may change:

```ts
class TextNode {
  exportJSON() {
    return { /* ... */, version: 2 };
  }
}
class ExtendedTextNode extends TextNode {
  exportJSON() {
    // The super's layout has changed, but the version information is lost
    return { ...super.exportJSON(), version: 1 };
  }
}
```

So then you have a situation where there are possibly two JSON layouts for `ExtendedTextNode` with the same version, because the base class version changed due to a package upgrade.

If you do have incompatible representations, it's probably best to choose a new type. This is basically the only way that will force old configurations to fail, as `importJSON` implementations often don't do runtime validation and dangerously assume that the values are the correct type.

There are other schemes that would allow for composable versions, such as nesting the superclass data, or choosing a different name for a version property in each subclass. In practice, explicit versioning is generally redundant if the serialization is properly parsed, so it is recommended that you use the simpler approach with a flat representation with mostly optional properties.

### Handling extended HTML styling

Since the TextNode is foundational to all Lexical packages, including the plain text use case. Handling any rich text logic is undesirable. This creates the need to override the TextNode to handle serialization and deserialization of HTML/CSS styling properties to achieve full fidelity between JSON \<-\> HTML. Since this is a very popular use case, below we are proving a recipe to handle the most common use cases.

You need to override the base TextNode:

```js
const initialConfig: InitialConfigType = {
    namespace: 'editor',
    theme: editorThemeClasses,
    onError: (error: any) => console.log(error),
    nodes: [
      ExtendedTextNode,
      {
        replace: TextNode,
        with: (node: TextNode) => new ExtendedTextNode(node.__text),
        withKlass: ExtendedTextNode,
      },
      ListNode,
      ListItemNode,
    ]
  };
```

and create a new Extended Text Node plugin

```js
import {
  $applyNodeReplacement,
  $isTextNode,
  DOMConversion,
  DOMConversionMap,
  DOMConversionOutput,
  NodeKey,
  TextNode,
  SerializedTextNode,
  LexicalNode
} from 'lexical';

export class ExtendedTextNode extends TextNode {
  constructor(text: string, key?: NodeKey) {
    super(text, key);
  }

  static getType(): string {
    return 'extended-text';
  }

  static clone(node: ExtendedTextNode): ExtendedTextNode {
    return new ExtendedTextNode(node.__text, node.__key);
  }

  static importDOM(): DOMConversionMap | null {
    const importers = TextNode.importDOM();
    return {
      ...importers,
      code: () => ({
        conversion: patchStyleConversion(importers?.code),
        priority: 1
      }),
      em: () => ({
        conversion: patchStyleConversion(importers?.em),
        priority: 1
      }),
      span: () => ({
        conversion: patchStyleConversion(importers?.span),
        priority: 1
      }),
      strong: () => ({
        conversion: patchStyleConversion(importers?.strong),
        priority: 1
      }),
      sub: () => ({
        conversion: patchStyleConversion(importers?.sub),
        priority: 1
      }),
      sup: () => ({
        conversion: patchStyleConversion(importers?.sup),
        priority: 1
      }),
    };
  }

  static importJSON(serializedNode: SerializedTextNode): TextNode {
    return $createExtendedTextNode().updateFromJSON(serializedNode);
  }

  isSimpleText() {
    return this.__type === 'extended-text' && this.__mode === 0;
  }

  // no need to add exportJSON here, since we are not adding any new properties
}

export function $createExtendedTextNode(text: string = ''): ExtendedTextNode {
  return $applyNodeReplacement(new ExtendedTextNode(text));
}

export function $isExtendedTextNode(node: LexicalNode | null | undefined): node is ExtendedTextNode {
	return node instanceof ExtendedTextNode;
}

function patchStyleConversion(
  originalDOMConverter?: (node: HTMLElement) => DOMConversion | null
): (node: HTMLElement) => DOMConversionOutput | null {
  return (node) => {
    const original = originalDOMConverter?.(node);
    if (!original) {
      return null;
    }
    const originalOutput = original.conversion(node);

    if (!originalOutput) {
      return originalOutput;
    }

    const backgroundColor = node.style.backgroundColor;
    const color = node.style.color;
    const fontFamily = node.style.fontFamily;
    const fontWeight = node.style.fontWeight;
    const fontSize = node.style.fontSize;
    const textDecoration = node.style.textDecoration;

    return {
      ...originalOutput,
      forChild: (lexicalNode, parent) => {
        const originalForChild = originalOutput?.forChild ?? ((x) => x);
        const result = originalForChild(lexicalNode, parent);
        if ($isTextNode(result)) {
          const style = [
            backgroundColor ? `background-color: ${backgroundColor}` : null,
            color ? `color: ${color}` : null,
            fontFamily ? `font-family: ${fontFamily}` : null,
            fontWeight ? `font-weight: ${fontWeight}` : null,
            fontSize ? `font-size: ${fontSize}` : null,
            textDecoration ? `text-decoration: ${textDecoration}` : null,
          ]
            .filter((value) => value != null)
            .join('; ');
          if (style.length) {
            return result.setStyle(style);
          }
        }
        return result;
      }
    };
  };
}
```

### `html` Property for Import and Export Configuration

The `html` property in `CreateEditorArgs` provides an alternate way to configure HTML import and export behavior in Lexical without subclassing or node replacement. It includes two properties:

- `import` - Similar to `importDOM`, it controls how HTML elements are transformed into `LexicalNodes`. However, instead of defining conversions directly on each `LexicalNode`, `html.import` provides a configuration that can be overridden easily in the editor setup.
  
- `export` - Similar to `exportDOM`, this property customizes how `LexicalNodes` are serialized into HTML. With `html.export`, users can specify transformations for various nodes collectively, offering a flexible override mechanism that can adapt without needing to extend or replace specific `LexicalNodes`.

#### Key Differences from `importDOM` and `exportDOM`

While `importDOM` and `exportDOM` allow for highly customized, node-specific conversions by defining them directly within the `LexicalNode` class, the `html` property enables broader, editor-wide configurations. This setup benefits situations where:

- **Consistent Transformations**: You want uniform import/export behavior across different nodes without adjusting each node individually.
- **No Subclassing Required**: Overrides to import and export logic are applied at the editor configuration level, simplifying customization and reducing the need for extensive subclassing.

#### Type Definitions

```typescript
type HTMLConfig = {
  export?: DOMExportOutputMap;  // Optional map defining how nodes are exported to HTML.
  import?: DOMConversionMap;     // Optional record defining how HTML is converted into nodes.
};
```

#### Example of a use case for the `html` Property for Import and Export Configuration:

[Rich text sandbox](https://stackblitz.com/github/facebook/lexical/tree/main/examples/react-rich?embed=1&file=src%2FApp.tsx&terminalHeight=0&ctl=1&showSidebar=0&devtoolsheight=0&view=preview)

---
sidebar_position: 3
---

# Theming

Lexical tries to make theming straight-forward, by providing a way of passing a customizable theming object that maps CSS class names to the editor on creation. Here's an example of a plain-text theme:

```js
const exampleTheme = {
  ltr: 'ltr',
  rtl: 'rtl',
  paragraph: 'editor-paragraph',
};
```

In your CSS, you can then add something like:

```css
.ltr {
  text-align: left;
}

.rtl {
  text-align: right;
}

.editor-placeholder {
  color: #999;
  overflow: hidden;
  position: absolute;
  top: 15px;
  left: 15px;
  user-select: none;
  pointer-events: none;
}

.editor-paragraph {
  margin: 0 0 15px 0;
  position: relative;
}
```

To apply it, you need to pass it to your editor instance. If you're using a framework like React, this is done by
passing it as a property of the `initialConfig` to `<LexicalComposer>`, like shown:

```jsx
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {PlainTextPlugin} from '@lexical/react/LexicalPlainTextPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {exampleTheme} from './exampleTheme';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';

const initialConfig = {namespace: 'MyEditor', theme: exampleTheme};

export default function Editor() {
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <PlainTextPlugin
        contentEditable={<ContentEditable />}
        placeholder={<div className="editor-placeholder">Enter some text...</div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
    </LexicalComposer>
  );
}
```

If you are using vanilla JS, you can pass it to the `createEditor()` function, like shown:

```js
import {createEditor} from 'lexical';

const editor = createEditor({
  namespace: 'MyEditor',
  theme: exampleTheme,
});
```

Many of the Lexical's core nodes also accept theming properties. Here's a more comprehensive theming object:

```js
const exampleTheme = {
  ltr: 'ltr',
  rtl: 'rtl',
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
    h4: 'editor-heading-h4',
    h5: 'editor-heading-h5',
    h6: 'editor-heading-h6',
  },
  list: {
    nested: {
      listitem: 'editor-nested-listitem',
    },
    ol: 'editor-list-ol',
    ul: 'editor-list-ul',
    listitem: 'editor-listItem',
    listitemChecked: 'editor-listItemChecked',
    listitemUnchecked: 'editor-listItemUnchecked',
  },
  hashtag: 'editor-hashtag',
  image: 'editor-image',
  link: 'editor-link',
  text: {
    bold: 'editor-textBold',
    code: 'editor-textCode',
    italic: 'editor-textItalic',
    strikethrough: 'editor-textStrikethrough',
    subscript: 'editor-textSubscript',
    superscript: 'editor-textSuperscript',
    underline: 'editor-textUnderline',
    underlineStrikethrough: 'editor-textUnderlineStrikethrough',
  },
  code: 'editor-code',
  codeHighlight: {
    atrule: 'editor-tokenAttr',
    attr: 'editor-tokenAttr',
    boolean: 'editor-tokenProperty',
    builtin: 'editor-tokenSelector',
    cdata: 'editor-tokenComment',
    char: 'editor-tokenSelector',
    class: 'editor-tokenFunction',
    'class-name': 'editor-tokenFunction',
    comment: 'editor-tokenComment',
    constant: 'editor-tokenProperty',
    deleted: 'editor-tokenProperty',
    doctype: 'editor-tokenComment',
    entity: 'editor-tokenOperator',
    function: 'editor-tokenFunction',
    important: 'editor-tokenVariable',
    inserted: 'editor-tokenSelector',
    keyword: 'editor-tokenAttr',
    namespace: 'editor-tokenVariable',
    number: 'editor-tokenProperty',
    operator: 'editor-tokenOperator',
    prolog: 'editor-tokenComment',
    property: 'editor-tokenProperty',
    punctuation: 'editor-tokenPunctuation',
    regex: 'editor-tokenVariable',
    selector: 'editor-tokenSelector',
    string: 'editor-tokenSelector',
    symbol: 'editor-tokenProperty',
    tag: 'editor-tokenProperty',
    url: 'editor-tokenOperator',
    variable: 'editor-tokenVariable',
  },
};
```


# Node Transforms

Transforms are the most efficient mechanism to respond to changes to the EditorState.

For example:
User types a character and you want to color the word blue if the word is now equal to "congrats".
We programmatically add an `@Mention` to the editor, the `@Mention` is immediately next to another `@Mention` (`@Mention@Mention`). Since we believe this makes mentions hard to read, we want to destroy/replace both mentions and render them as plain TextNode's instead.

```js
const removeTransform = editor.registerNodeTransform(TextNode, (textNode) => {
  if (textNode.getTextContent() === 'blue') {
    textNode.setTextContent('green');
  }
});
```

## Syntax

```typescript
editor.registerNodeTransform<T: LexicalNode>(Class<T>, T): () => void
```

## Lifecycle

Transforms are executed sequentially before changes are propagated to the DOM and multiple transforms still lead to a single DOM reconciliation (the most expensive operation in Lexical's lifecycle).

![Transforms lifecycle](/img/docs/transforms-lifecycle.svg)

:::caution Beware!

While it is possible to achieve the same or very similar result through an [update listener](/docs/concepts/listeners#registerupdatelistener) followed by an update, this is highly discouraged as it triggers an additional render (the most expensive lifecycle operation).

Additionally, each cycle creates a brand new `EditorState` object which can interfere with plugins like HistoryPlugin (undo-redo) if not handled correctly.

```js
editor.registerUpdateListener(() => {
  editor.update(() => {
    // Don't do this
  });
});
```

:::

### Transform heuristic

1. We transform leaves first. If transforms generate additional dirty nodes we repeat `step 1`. The reasoning behind this is that marking a leaf as dirty marks all its parent elements as dirty too.
2. We transform elements.
    - If element transforms generate additional dirty nodes we repeat `step 1`.
    - If element transforms only generate additional dirty elements we only repeat `step 2`.

Node will be marked as dirty on any (or most) modifications done to it, it's children or siblings in certain cases.

## Preconditions

Preconditions are fundamental for transforms to prevent them from running multiple times and ultimately causing an infinite loop.

Transforms are designed to run when nodes have been modified (aka marking nodes dirty). For the most part, transforms only need to run once after the update but the sequential nature of transforms makes it possible to have order bias. Hence, transforms are run over and over until this particular type of Node is no longer marked as dirty by any of the transforms.

Hence, we have to make sure that the transforms do not mark the node dirty unnecessarily.

```js
// When a TextNode changes (marked as dirty) make it bold
editor.registerNodeTransform(TextNode, textNode => {
  // Important: Check current format state
  if (!textNode.hasFormat('bold')) {
    textNode.toggleFormat('bold');
  }
}
```

But oftentimes, the order is not important. The below would always end up in the result of the two transforms:

```js
// Plugin 1
editor.registerNodeTransform(TextNode, textNode => {
  // This transform runs twice but does nothing the first time because it doesn't meet the preconditions
  if (textNode.getTextContent() === 'modified') {
    textNode.setTextContent('re-modified');
  }
})
// Plugin 2
editor.registerNodeTransform(TextNode, textNode => {
  // This transform runs only once
  if (textNode.getTextContent() === 'original') {
    textNode.setTextContent('modified');
  }
})
// App
editor.addListener('update', ({editorState}) => {
  const text = editorState.read($textContent);
  // text === 're-modified'
});
```

## Transforms on parent nodes

Transforms are very specific to a type of node. This applies to both the declaration (`registerNodeTransform(ImageNode)`) and the times it triggers during an update cycle.

```js
// Won't trigger
editor.registerNodeTransform(ParagraphNode, ..)
// Will trigger as TextNode was marked dirty
editor.registerNodeTransform(TextNode, ..)
editor.update(() => {
  const textNode = $getNodeByKey('3');
  textNode.setTextContent('foo');
});
```

While the marked dirty rule is always true, there are some cases when it's not immediately obvious and/or we force nearby nodes to become dirty for the sake of easier transform logic:
You add a node to an ElementNode, the ElementNode and the newly added children are marked dirty, also its new immediate siblings
You remove a node, its parent is marked dirty, also the node's immediate siblings prior to being removed
You move a node via `replace`, rules 2 and 1 are applied.

```js
editor.registerNodeTransform(ParagraphNode, paragraph => {
 // Triggers
});
editor.update(() => {
  const paragraph = $getRoot().getFirstChild();
  paragraph.append($createTextNode('foo');
});
```

## registerLexicalTextEntity

It is common to have certain nodes that are created/destroyed based on their text content and siblings. For example, `#lexical` is a valid hashtag whereas `#!lexical` is not.

This is a perfectly valid case for transforms but we have gone ahead and already built a utility transform wrapper for you for this specific case:

```typescript
registerLexicalTextEntity<N: TextNode>(
  editor: LexicalEditor,
  getMatch: (text: string) => null | EntityMatch,
  targetNode: Class<N>,
  createNode: (textNode: TextNode) => N,
): Array<() => void>;
```

## Examples

1. [Emojis](https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/EmojisPlugin/index.ts)
2. [AutoLink](https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/AutoLinkPlugin/index.tsx)
3. [HashtagPlugin](https://github.com/facebook/lexical/blob/main/packages/lexical-react/src/LexicalHashtagPlugin.ts)
