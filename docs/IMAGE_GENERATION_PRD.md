# Image Generation PRD

## Overview

The Story Nexus should support image generation as a first-class writing workflow, separate from Scene Beat prose generation. Writers should be able to create a dedicated image generation block from the editor slash menu, generate images with either local ComfyUI workflows or OpenRouter image models, save generated/uploaded images as reusable story assets, and insert selected images into chapter content.

The feature should also introduce an asset persistence layer that moves large image bytes out of chapter JSON and away from Dexie-only assumptions. For v1, metadata can remain in Dexie, but image storage must be abstracted so desktop Tauri and future web builds can use different byte stores behind the same app-facing API.

## Goals

- Add a new `/image` slash command that inserts an Image Generation block.
- Support text-to-image and image-to-image generation.
- Support local ComfyUI using user-provided API-format workflows.
- Support OpenRouter direct image generation models.
- Add an `image_gen` prompt type with a single user prompt message.
- Store generated and uploaded images as reusable assets, not inline base64 in chapter content.
- Add a story-level image gallery accessible from the editor right rail.
- Keep the implementation web-compatible by introducing storage/provider abstractions.

## Non-Goals

- Do not replace Scene Beat or merge image generation into Scene Beat.
- Do not implement a full ComfyUI workflow editor.
- Do not migrate all existing Dexie data to SQLite/Postgres in this feature.
- Do not require a server backend for v1.
- Do not make Postgres or cloud object storage mandatory.

## User Experience

### Editor Image Generation Block

Users can type `/image` in the Lexical editor and choose an image generation command. This inserts a dedicated Image Generation block.

The block should include:

- Mode selector: `Text to Image` or `Image to Image`.
- Prompt textarea.
- Prompt preset selector filtered to `image_gen`.
- Provider selector: `ComfyUI` or `OpenRouter`.
- Model/workflow selector based on provider.
- Basic generation options:
  - aspect ratio or width/height
  - seed mode: random or fixed
  - steps/CFG when supported by the provider/workflow mapping
  - image strength for image-to-image when supported
- For image-to-image:
  - upload/select source image
  - source image preview
- Generate button.
- Result preview area.
- Insert button that inserts the selected result into the chapter.
- Save/reuse metadata for regeneration.
- Delete/collapse controls.

### Image Gallery

Add a right-rail button that opens a sheet for a story-level image gallery.

The gallery should show:

- Generated images.
- Uploaded source images.
- Provider/model/workflow metadata.
- Prompt and resolved prompt.
- Created date.
- Whether the asset is inserted in any chapter.

Gallery actions:

- Insert at cursor.
- Reuse as image-to-image source.
- Copy prompt.
- Archive/delete.
- Open metadata/details.

Deletion behavior:

- If an asset is referenced by chapter content, archive it instead of deleting bytes.
- If unreferenced, allow full deletion.

## Prompt Requirements

Add a new prompt type:

```ts
promptType: "image_gen"
```

Rules:

- An `image_gen` prompt must contain exactly one message.
- The message role must be `user`.
- The prompt can use existing parser variables, especially `{{user_input}}`.
- The user's block prompt should be passed into the parser as the user input source.

Default image prompt:

```text
{{user_input}}

Create a detailed image generation prompt. Preserve character, setting, mood, visual style, and concrete composition. Do not include prose narration.
```

The prompt form should hide multi-message controls for `image_gen`.

## Storage Requirements

### Storage Direction

Use asset references in editor content and store image bytes separately.

Do not store generated images as base64 inside chapter Lexical JSON except as a temporary compatibility fallback.

### Asset Reference Format

Inserted images should use a stable app asset reference:

```text
story-nexus-asset:<assetId>
```

The image render path must resolve this reference to a displayable URL at runtime.

Existing image URLs and existing data URLs must continue to render.

### Asset Storage Abstraction

Add an app-facing asset storage interface:

```ts
interface AssetStorage {
  saveAsset(input: SaveAssetInput): Promise<MediaAsset>;
  getDisplayUrl(assetId: string): Promise<string>;
  readAssetBytes(assetId: string): Promise<Uint8Array>;
  deleteAsset(assetId: string): Promise<void>;
}
```

Implement two v1 storage backends:

- `TauriFileAssetStorage`
  - Stores image bytes in app-local data.
  - Uses Tauri filesystem permissions scoped to the app image asset directory.
  - Uses Tauri asset protocol / file URL conversion for display.
- `IndexedDbAssetStorage`
  - Stores image blobs in Dexie.
  - Used for browser/web compatibility and dev browser builds.

Selection behavior:

- In Tauri desktop, prefer file storage.
- In browser/web, use IndexedDB blob storage.
- The rest of the app should call the same asset repository API regardless of backend.

### Dexie Metadata Tables

Add metadata tables while keeping broad future migration compatibility.

`mediaAssets`:

- `id`
- `storyId`
- `chapterId?`
- `kind`: `generated` | `uploaded` | `imported`
- `mimeType`
- `filename`
- `storageBackend`: `tauri_file` | `indexeddb_blob`
- `storageKey`
- `sizeBytes`
- `width?`
- `height?`
- `source`: `comfyui` | `openrouter` | `upload` | `import`
- `createdAt`
- `archivedAt?`
- `metadata?`

`mediaBlobs`:

- `assetId`
- `blob`
- `createdAt`

`imageGenerations`:

- `id`
- `storyId`
- `chapterId?`
- `mode`: `txt2img` | `img2img`
- `provider`: `comfyui` | `openrouter`
- `prompt`
- `resolvedPrompt`
- `promptId?`
- `modelId?`
- `workflowId?`
- `sourceAssetIds`
- `outputAssetIds`
- `settings`
- `status`: `pending` | `running` | `succeeded` | `failed` | `cancelled`
- `error?`
- `createdAt`
- `completedAt?`

## Provider Requirements

### ComfyUI

ComfyUI support should be simple but configurable.

Settings:

- Base URL, default `http://127.0.0.1:8188`.
- Text-to-image workflow JSON.
- Image-to-image workflow JSON.
- Workflow mapping config for each workflow.

Workflow mapping config must include configurable node IDs and field paths for:

- positive prompt text
- source image input for image-to-image
- seed
- width
- height
- steps
- CFG
- sampler/model if supported
- output image node

Generation flow:

1. Resolve prompt through the `image_gen` prompt parser.
2. Patch the selected workflow JSON using mapping config.
3. For image-to-image, upload source image to ComfyUI via `/upload/image`.
4. Submit workflow to `/prompt`.
5. Track progress using `/ws` when practical, or poll `/history/{prompt_id}`.
6. Fetch output images through `/view`.
7. Save returned image bytes as media assets.
8. Create an `imageGenerations` record.

Failure handling:

- ComfyUI offline: show a clear local server error.
- Workflow validation error: show returned validation details if available.
- Missing mapped node/path: block generation and show mapping error.
- No output image found: show provider error and keep generation record as failed.

Reference: ComfyUI server routes include `/prompt`, `/history/{prompt_id}`, `/upload/image`, and `/view`.

### OpenRouter

Use OpenRouter direct image models, not the beta image generation server tool for v1.

Model discovery:

- Fetch models with `output_modalities=image`.
- Keep image-capable model list separate from text chat models.

Generation flow:

1. Resolve prompt through the `image_gen` prompt parser.
2. Send chat completion request with `modalities`.
3. Include `image_config` for aspect ratio/size where supported.
4. Parse returned assistant `images`.
5. Save returned data URLs as media assets.
6. Create an `imageGenerations` record.

For image-to-image:

- Enable only for models that support image input.
- Send source image as base64 image content.
- If model capability is unknown, disable image-to-image for that OpenRouter model.

Reference: OpenRouter image generation supports image output model discovery and returned assistant images.

## Settings Requirements

Extend AI settings with image generation fields:

- `defaultImageProvider`
- `defaultImagePromptId`
- `defaultOpenRouterImageModelId`
- `comfyBaseUrl`
- `comfyTxt2ImgWorkflowJson`
- `comfyImg2ImgWorkflowJson`
- `comfyTxt2ImgMapping`
- `comfyImg2ImgMapping`
- `defaultImageAspectRatio`
- `defaultImageWidth`
- `defaultImageHeight`
- `defaultImageSeedMode`
- `defaultImageSteps`
- `defaultImageCfg`

Settings UI should expose:

- ComfyUI base URL.
- Paste/edit text-to-image workflow JSON.
- Paste/edit image-to-image workflow JSON.
- Mapping fields for required nodes.
- Refresh OpenRouter image models.
- Default provider/model/prompt.

## Data Flow

### Text to Image

1. User inserts `/image`.
2. User selects `Text to Image`.
3. User enters a prompt and selects an `image_gen` prompt preset.
4. App resolves final prompt.
5. Provider generates one or more images.
6. App saves outputs as media assets.
7. Block previews outputs.
8. User inserts selected output.
9. Lexical image node stores `story-nexus-asset:<assetId>`.

### Image to Image

1. User inserts `/image`.
2. User selects `Image to Image`.
3. User uploads or selects a source image from gallery.
4. Source image is saved as a media asset.
5. User enters prompt and selects provider/workflow/model.
6. Provider receives source image and resolved prompt.
7. Generated outputs are saved as media assets.
8. User inserts selected output.

## Export And Import

Add a v2 story export package format for stories with assets.

Recommended package contents:

```text
story-export.json
assets/
  <assetId>.<ext>
```

Manifest should include:

- story data
- chapters
- lorebook entries
- prompts only if explicitly selected later
- scene beats
- media assets metadata
- image generation records

Import behavior:

- Generate new story/chapter/asset IDs.
- Copy asset files into the active storage backend.
- Rewrite chapter asset references to new asset IDs.
- Preserve generation metadata where possible.

JSON-only legacy export can remain, but should warn if the story has image assets that will not be bundled.

## Persistence Strategy Beyond V1

Short-term:

- Dexie remains metadata store.
- Large bytes use asset storage abstraction.
- Browser builds use IndexedDB blobs.
- Tauri builds use app-local files.

Medium-term desktop:

- SQLite is a good replacement for Dexie metadata in Tauri.
- Image bytes should remain in files, with SQLite storing metadata and paths.

Future web:

- Postgres can store relational metadata.
- Object storage such as S3, R2, Supabase Storage, or similar should store image bytes.
- The same `AssetRepository` interface should map to server APIs.

This feature should not lock the app into any one future database.

## Implementation Notes

Likely code areas:

- Prompt types and prompt form validation.
- Dexie schema version bump.
- New media asset repositories/services.
- Lexical image node/render path for asset reference resolution.
- New Image Generation Lexical node.
- Slash command plugin.
- AI settings panel.
- OpenRouter image model discovery and generation.
- ComfyUI workflow provider.
- Editor right rail gallery sheet.
- Story export/import.

The implementation should keep provider logic out of UI components. UI calls an image generation hook/store, which calls provider services and asset repositories.

## Acceptance Criteria

- User can create an Image Generation block with `/image`.
- User can create/select `image_gen` prompts.
- `image_gen` prompts enforce exactly one user message.
- User can paste ComfyUI workflow JSON and configure node mappings.
- Text-to-image works with ComfyUI when a valid workflow is configured.
- Image-to-image works with ComfyUI using an uploaded source image.
- OpenRouter image-capable models can be fetched separately from chat models.
- Text-to-image works with OpenRouter image models.
- Generated images are saved as media assets.
- Uploaded source images are saved as media assets.
- Inserted editor images use asset refs, not base64 data URLs.
- Existing URL/data-URL images still render.
- Gallery sheet lists story images and can insert an asset into the editor.
- Browser/dev build can use IndexedDB blob storage.
- Tauri build can use file-backed storage once filesystem permissions are configured.
- Story export warns or bundles assets according to the new export path.

## Verification Plan

- Run TypeScript build.
- Verify `/image` appears in slash command menu.
- Verify Image Generation block renders and can be deleted/collapsed.
- Verify `image_gen` prompt form hides multi-message controls.
- Verify image assets persist after app reload.
- Verify inserted asset images render after app reload.
- Verify gallery sheet opens from right rail and shows saved assets.
- Verify ComfyUI offline error is clear.
- Verify OpenRouter no-image response is handled cleanly.
- Verify import/export behavior for a story with at least one inserted image.

