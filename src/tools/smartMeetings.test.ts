import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "../client/domains/smart-meetings/index.js";
import { findRegisteredTool } from "../test/harness/assertions.js";
import { createMcpServerHarness } from "../test/harness/mcp-server.js";
import { registerSmartMeetingTools } from "./smartMeetings.js";

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

function extractText(result: CallToolResult): string {
  return result.content
    .filter(
      (item): item is { type: "text"; text: string } => item.type === "text",
    )
    .map((item) => item.text)
    .join("\n");
}

describe("smart meeting tool attendee validation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects availability input when both attendeeEmail and attendeeEmails are supplied", async () => {
    const { harness, server } = createMcpServerHarness();
    registerSmartMeetingTools(server);

    const availabilityTool = findRegisteredTool(
      harness.tools,
      "reclaim_get_smart_meeting_availability",
    );
    const availabilitySpy = vi.spyOn(api, "getSmartMeetingAvailability");

    const result = (await availabilityTool.handler({
      smartMeetingId: 42,
      attendeeEmail: "one@example.com",
      attendeeEmails: ["two@example.com"],
    })) as CallToolResult;

    expect(result.isError).toBe(true);
    expect(extractText(result)).toContain("mutually exclusive");
    expect(availabilitySpy).not.toHaveBeenCalled();
  });

  it("rejects organizer invite input when both attendeeEmail and attendeeEmails are supplied", async () => {
    const { harness, server } = createMcpServerHarness();
    registerSmartMeetingTools(server);

    const inviteTool = findRegisteredTool(
      harness.tools,
      "reclaim_invite_smart_meeting_organizer",
    );
    const inviteSpy = vi.spyOn(api, "inviteSmartMeetingOrganizer");

    const result = (await inviteTool.handler({
      smartMeetingId: 42,
      attendeeEmail: "one@example.com",
      attendeeEmails: ["two@example.com"],
    })) as CallToolResult;

    expect(result.isError).toBe(true);
    expect(extractText(result)).toContain("mutually exclusive");
    expect(inviteSpy).not.toHaveBeenCalled();
  });

  it("rejects detect input when both attendeeEmail and attendeeEmails are supplied", async () => {
    const { harness, server } = createMcpServerHarness();
    registerSmartMeetingTools(server);

    const detectTool = findRegisteredTool(
      harness.tools,
      "reclaim_detect_smart_meetings",
    );
    const detectSpy = vi.spyOn(api, "detectSmartMeetings");

    const result = (await detectTool.handler({
      attendeeEmail: "one@example.com",
      attendeeEmails: ["two@example.com"],
    })) as CallToolResult;

    expect(result.isError).toBe(true);
    expect(extractText(result)).toContain("mutually exclusive");
    expect(detectSpy).not.toHaveBeenCalled();
  });

  it("rejects diagnostics input when both attendeeEmail and attendeeEmails are supplied", async () => {
    const { harness, server } = createMcpServerHarness();
    registerSmartMeetingTools(server);

    const diagnosticsTool = findRegisteredTool(
      harness.tools,
      "reclaim_get_smart_meeting_availability_diagnostics",
    );
    const diagnosticsSpy = vi.spyOn(
      api,
      "getSmartMeetingAvailabilityDiagnostics",
    );

    const result = (await diagnosticsTool.handler({
      attendeeEmail: "one@example.com",
      attendeeEmails: ["two@example.com"],
    })) as CallToolResult;

    expect(result.isError).toBe(true);
    expect(extractText(result)).toContain("mutually exclusive");
    expect(diagnosticsSpy).not.toHaveBeenCalled();
  });

  it("rejects availability input when reserved attendee keys are supplied via query", async () => {
    const { harness, server } = createMcpServerHarness();
    registerSmartMeetingTools(server);

    const availabilityTool = findRegisteredTool(
      harness.tools,
      "reclaim_get_smart_meeting_availability",
    );
    const availabilitySpy = vi.spyOn(api, "getSmartMeetingAvailability");

    const result = (await availabilityTool.handler({
      smartMeetingId: 42,
      query: {
        attendeeEmail: "one@example.com",
        attendeeEmails: ["two@example.com"],
      },
    })) as CallToolResult;

    expect(result.isError).toBe(true);
    expect(extractText(result)).toContain("reserved attendee keys");
    expect(availabilitySpy).not.toHaveBeenCalled();
  });

  it("rejects invite input when reserved attendee keys are supplied via query", async () => {
    const { harness, server } = createMcpServerHarness();
    registerSmartMeetingTools(server);

    const inviteTool = findRegisteredTool(
      harness.tools,
      "reclaim_invite_smart_meeting_organizer",
    );
    const inviteSpy = vi.spyOn(api, "inviteSmartMeetingOrganizer");

    const result = (await inviteTool.handler({
      smartMeetingId: 42,
      query: {
        attendeeEmail: "one@example.com",
        attendeeEmails: ["two@example.com"],
      },
    })) as CallToolResult;

    expect(result.isError).toBe(true);
    expect(extractText(result)).toContain("reserved attendee keys");
    expect(inviteSpy).not.toHaveBeenCalled();
  });

  it("rejects invite input when reserved attendee keys are supplied via payload", async () => {
    const { harness, server } = createMcpServerHarness();
    registerSmartMeetingTools(server);

    const inviteTool = findRegisteredTool(
      harness.tools,
      "reclaim_invite_smart_meeting_organizer",
    );
    const inviteSpy = vi.spyOn(api, "inviteSmartMeetingOrganizer");

    const result = (await inviteTool.handler({
      smartMeetingId: 42,
      payload: {
        attendeeEmail: "one@example.com",
      },
    })) as CallToolResult;

    expect(result.isError).toBe(true);
    expect(extractText(result)).toContain("reserved attendee keys");
    expect(inviteSpy).not.toHaveBeenCalled();
  });

  it("rejects invite input when payload attendee keys try to bypass attendee field validation", async () => {
    const { harness, server } = createMcpServerHarness();
    registerSmartMeetingTools(server);

    const inviteTool = findRegisteredTool(
      harness.tools,
      "reclaim_invite_smart_meeting_organizer",
    );
    const inviteSpy = vi.spyOn(api, "inviteSmartMeetingOrganizer");

    const result = (await inviteTool.handler({
      smartMeetingId: 42,
      attendeeEmail: "primary@example.com",
      payload: {
        attendeeEmails: ["secondary@example.com"],
      },
    })) as CallToolResult;

    expect(result.isError).toBe(true);
    expect(extractText(result)).toContain("reserved attendee keys");
    expect(inviteSpy).not.toHaveBeenCalled();
  });
});
