import { expect } from "vitest";

import { ReclaimError } from "../../types/reclaim.js";
import type { RegisteredTool } from "./mcp-server.js";
import type { ToolAnnotations } from "../../server/tool-metadata.js";

type ErrorExpectation = {
  context: string;
  messageFragment: string;
  status?: number | undefined;
  detailMatcher?: unknown;
};

export function expectReclaimToolNames(tools: readonly RegisteredTool[]): void {
  for (const tool of tools) {
    expect(tool.name.startsWith("reclaim_")).toBe(true);
  }
}

export function findRegisteredTool(
  tools: readonly RegisteredTool[],
  name: string,
): RegisteredTool {
  const tool = tools.find((candidate) => candidate.name === name);
  expect(tool, `Expected tool "${name}" to be registered`).toBeDefined();
  return tool as RegisteredTool;
}

export function expectToolAnnotations(
  tool: RegisteredTool,
  expected: Partial<ToolAnnotations>,
): void {
  expect(tool.definition.annotations).toEqual(
    expect.objectContaining(expected),
  );
}

export function expectNormalizedReclaimError(
  error: unknown,
  expectation: ErrorExpectation,
): void {
  expect(error).toBeInstanceOf(ReclaimError);
  const reclaimError = error as ReclaimError;
  expect(reclaimError.message).toContain(
    `API Call Failed (${expectation.context}):`,
  );
  expect(reclaimError.message).toContain(expectation.messageFragment);

  if ("status" in expectation) {
    expect(reclaimError.status).toBe(expectation.status);
  }

  if (expectation.detailMatcher !== undefined) {
    expect(reclaimError.detail).toEqual(expectation.detailMatcher);
  }
}
