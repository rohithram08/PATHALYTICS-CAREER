// src/lib/greenhouseAPI.ts

export interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location: { name: string };
  departments: { id: number; name: string }[];
  offices: { id: number; name: string; location?: string }[];
  updated_at: string;
  /** Slug we add ourselves so we know which company board this came from */
  company_slug: string;
  /** Pretty company name for display */
  company_name: string;
}

/**
 * Companies whose Greenhouse boards we query.
 * To add more: visit https://boards.greenhouse.io/<company-slug> and confirm it loads.
 */
export const GREENHOUSE_COMPANIES: { slug: string; name: string }[] = [
  { slug: "airbnb", name: "Airbnb" },
  { slug: "stripe", name: "Stripe" },
  { slug: "figma", name: "Figma" },
  { slug: "discord", name: "Discord" },
  { slug: "reddit", name: "Reddit" },
  { slug: "instacart", name: "Instacart" },
  { slug: "gitlab", name: "GitLab" },
  { slug: "cloudflare", name: "Cloudflare" },
  { slug: "twilio", name: "Twilio" },
  { slug: "pinterest", name: "Pinterest" },
  { slug: "robinhood", name: "Robinhood" },
  { slug: "dropbox", name: "Dropbox" },
  { slug: "coinbase", name: "Coinbase" },
  { slug: "samsara", name: "Samsara" },
  { slug: "scaleai", name: "Scale AI" },
  { slug: "plaid", name: "Plaid" },
];

const BOARDS_BASE = "https://boards-api.greenhouse.io/v1/boards";

async function fetchOneCompany(
  slug: string,
  name: string
): Promise<GreenhouseJob[]> {
  try {
    const res = await fetch(`${BOARDS_BASE}/${slug}/jobs`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.jobs || []).map((j: any) => ({
      id: j.id,
      title: j.title,
      absolute_url: j.absolute_url,
      location: j.location || { name: "Remote" },
      departments: j.departments || [],
      offices: j.offices || [],
      updated_at: j.updated_at,
      company_slug: slug,
      company_name: name,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch all Greenhouse jobs across supported companies.
 * Optionally filter client-side by query (matches title, dept, or company).
 */
export async function fetchAllGreenhouseJobs(
  query?: string,
  limit?: number
): Promise<GreenhouseJob[]> {
  const all = await Promise.all(
    GREENHOUSE_COMPANIES.map((c) => fetchOneCompany(c.slug, c.name))
  );
  let jobs = all.flat();

  if (query) {
    const q = query.toLowerCase();
    jobs = jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.company_name.toLowerCase().includes(q) ||
        j.departments.some((d) => d.name.toLowerCase().includes(q))
    );
  }

  // Sort newest first
  jobs.sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  return limit ? jobs.slice(0, limit) : jobs;
}