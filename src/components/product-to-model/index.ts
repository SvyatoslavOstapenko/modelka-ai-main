/**
 * Product-to-Model Components
 *
 * Компоненты для инструмента "Товар → Модель"
 */

export { ProductSmartUploader } from './product-smart-uploader';
export type { ProductSmartUploaderProps, UploadedFile, ValidationError } from './product-smart-uploader';

export { CommandDock } from './command-dock';
export type { CommandDockProps } from './command-dock';

export { GenerationProgress, PRODUCT_TO_MODEL_STEPS } from './generation-progress';
export type { GenerationProgressProps, NarrativeStep } from './generation-progress';

export { SingleUploaderWorkspace } from './single-uploader-workspace';
export type { SingleUploaderWorkspaceProps } from './single-uploader-workspace';

export { AddModelDialog } from './dialogs/add-model-dialog';
export type { AddModelDialogProps } from './dialogs/add-model-dialog';

export { UploadDialog } from './dialogs/upload-dialog';
export type { UploadDialogProps } from './dialogs/upload-dialog';
