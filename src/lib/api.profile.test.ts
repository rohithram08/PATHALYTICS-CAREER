import { describe, it, expect, vi, beforeEach } from "vitest";
import { recruiterApi } from "./api";

// Covers the P1.1 stabilization fix: the backend's real field name is
// `company_website`, but RecruiterProfileSetup.tsx's UI state (and the
// rest of the app) uses `website`. recruiterApi.profile.get()/update()
// translate between the two at the API-client boundary so the mismatch
// can't silently reappear — these tests fail loudly if it does.

function mockJsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

describe("recruiterApi.profile field mapping", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("get() maps the wire's company_website to the app-level website field", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockJsonResponse({
        company_name: "Acme Inc",
        company_size: "11-50",
        industry: "Tech",
        designation: "HR Manager",
        company_website: "https://acme.example",
        verification_status: "pending",
      })
    );

    const profile = await recruiterApi.profile.get();

    expect(profile.website).toBe("https://acme.example");
    expect(profile).not.toHaveProperty("company_website");
    expect(profile.company_name).toBe("Acme Inc");
  });

  it("get() falls back to an empty string when company_website is absent (new/no profile yet)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockJsonResponse({
        company_name: "",
        company_size: "1-10",
        industry: "",
        designation: "",
        verification_status: "pending",
      })
    );

    const profile = await recruiterApi.profile.get();
    expect(profile.website).toBe("");
  });

  it("update() sends the app-level website field on the wire as company_website, not website", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ message: "Profile updated" }));

    await recruiterApi.profile.update({
      company_name: "Acme Inc",
      company_size: "11-50",
      industry: "Tech",
      designation: "HR Manager",
      website: "https://acme.example",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];

    expect(url).toContain("/api/recruiter/profile");
    expect(options.method).toBe("PUT"); // the P1.1 batch-4 method fix, still correct

    const sentBody = JSON.parse(options.body as string);
    expect(sentBody.company_website).toBe("https://acme.example");
    expect(sentBody).not.toHaveProperty("website");
    // Everything else should pass through unchanged
    expect(sentBody.company_name).toBe("Acme Inc");
    expect(sentBody.company_size).toBe("11-50");
  });
});
