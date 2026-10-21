import { describe, it, expect, vi, beforeEach } from "vitest";
import { recruiterApi } from "./api";

// Covers the P1.2 consolidation: recruiterApi.applications.updateStatus()
// is now the one canonical way to change an application's status/stage/
// notes (replacing the removed candidates.updateStage()). These tests
// verify the client sends the right method/URL/payload shape for each
// independently-optional field combination — the backend's transition/
// transaction/history behavior itself needs a live server + DB and isn't
// covered here (see PATHALYTICS_ENGINEERING_STATE.md).

function mockJsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

describe("recruiterApi.applications.updateStatus", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("hits the canonical PATCH /api/applications/:id/status endpoint", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ message: "Application updated", status: "screening" }));

    await recruiterApi.applications.updateStatus(42, { status: "screening" });

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/applications/42/status");
    expect(options.method).toBe("PATCH");
  });

  it("sends a status-only payload without stageId or notes", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ message: "ok", status: "screening" }));

    await recruiterApi.applications.updateStatus(1, { status: "screening" });

    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ status: "screening" });
  });

  it("sends a stageId-only payload (no status change)", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ message: "ok", status: "applied" }));

    await recruiterApi.applications.updateStatus(1, { stageId: 7 });

    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ stageId: 7 });
  });

  it("sends a notes-only payload (the P1.2 addition — no status or stageId)", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ message: "ok", status: "applied" }));

    await recruiterApi.applications.updateStatus(1, { notes: "Strong candidate" });

    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ notes: "Strong candidate" });
    expect(body).not.toHaveProperty("status");
    expect(body).not.toHaveProperty("stageId");
  });

  it("sends status + stageId + notes together when all three are provided", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ message: "ok", status: "hired" }));

    await recruiterApi.applications.updateStatus(1, { status: "hired", stageId: 9, notes: "Offer extended" });

    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ status: "hired", stageId: 9, notes: "Offer extended" });
  });
});
