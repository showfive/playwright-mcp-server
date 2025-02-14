import { z } from 'zod';
import { toolSchemas } from '../config/tool-config.js';

export interface UseKeyboardOptions {
    contextId: string;
    selector: string;
    text: string;
    submit?: boolean;
}

export interface GetElementsOptions {
    contextId: string;
    maxDepth?: number;
    selector?: string;
}

export interface GetElementInfoOptions {
    contextId: string;
    selector: string;
}

export interface InteractiveElementAction {
    action: 'click' | 'type' | 'select' | 'check' | 'uncheck' | 'toggle' | 'focus' | 'blur' | 'hover';
    value?: string;
}

export interface GetInteractiveElementsOptions {
    contextId: string;
    includeDetails?: boolean;
}

export interface ControlInteractiveElementOptions {
    contextId: string;
    selector: string;
    action: InteractiveElementAction['action'];
    value?: string;
}

export type ToolArgs = {
    create_browser: z.infer<typeof toolSchemas.create_browser>;
    use_keyboard: z.infer<typeof toolSchemas.use_keyboard>;
    navigate: z.infer<typeof toolSchemas.navigate>;
    get_elements: z.infer<typeof toolSchemas.get_elements>;
    get_element_info: z.infer<typeof toolSchemas.get_element_info>;
    get_page_content: z.infer<typeof toolSchemas.get_page_content>;
    get_interactive_elements: z.infer<typeof toolSchemas.get_interactive_elements>;
    control_interactive_elements: z.infer<typeof toolSchemas.control_interactive_elements>;
};