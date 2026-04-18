import type { z } from "zod";

export type ToolAnnotations = {
  readOnlyHint?: boolean;
  idempotentHint: boolean;
  destructiveHint: boolean;
};

export function toolAnnotations(options: {
  readOnly?: boolean;
  idempotent?: boolean;
  destructive?: boolean;
}): ToolAnnotations {
  const readOnly = options.readOnly ?? false;
  return {
    ...(readOnly ? { readOnlyHint: true } : {}),
    idempotentHint: options.idempotent ?? readOnly,
    destructiveHint: options.destructive ?? false,
  };
}

export function reclaimToolName(suffix: string): string {
  return `reclaim_${suffix}`;
}

export function buildToolDefinition<
  TInputSchema extends z.ZodRawShape,
>(options: {
  title: string;
  description: string;
  inputSchema: TInputSchema;
  annotations: ToolAnnotations;
}): {
  title: string;
  description: string;
  inputSchema: TInputSchema;
  annotations: ToolAnnotations;
} {
  return {
    title: options.title,
    description: options.description,
    inputSchema: options.inputSchema,
    annotations: options.annotations,
  };
}
