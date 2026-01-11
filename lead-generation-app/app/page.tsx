"use client";

import type React from "react";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  Linkedin,
  Mail,
  MapPin,
  Send,
  Sparkles,
  Target,
  UserRound,
  Users,
} from "lucide-react";

type FounderDetail = {
  name?: string;
  title?: string | null;
  linkedin_url?: string | null;
  verified_email?: string | null;
  email_status?: string | null;
  twitter_url?: string | null;
};

type CompanyMatch = {
  id?: string;
  company_id?: number;
  score?: number;
  company_name?: string;
  short_description?: string | null;
  ai_reason?: string | null;
  tags?: string[];
  location?: string | null;
  country?: string | null;
  batch?: string | null;
  status?: string | null;
  website?: string | null;
  linkedin_url?: string | null;
  team_size?: number | null;
  num_founders?: number | null;
  founders_names?: string[] | null;
  founder_details?: FounderDetail[] | string | null;
  founder_emails?: string[] | null;
  founder_linkedin_urls?: string[] | null;
  published_company_email?: string | null;
  company_email?: string | null;
  support_email?: string | null;
  contact_email?: string | null;
  general_email?: string | null;
  company_emails?: string[] | null;
  emails?: string[] | null;
};

type LeadsApiResponse = {
  success?: boolean;
  original_query?: string;
  strategy?: Record<string, unknown>;
  match_count?: number;
  matches?: CompanyMatch[];
  error?: string;
};

const HIDDEN_STRATEGY_KEYS = new Set(["semantic_query", "company_name"]);

const normalizeUrl = (url?: string | null) => {
  if (!url) return null;
  return url.startsWith("http") ? url : `https://${url}`;
};

const formatFilterLabel = (key: string) =>
  key
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");

const formatFilterValue = (value: unknown) => {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value ?? "");
};

const getScoreLabel = (score?: number) => {
  if (typeof score !== "number") return "Score unavailable";
  return `${(score * 100).toFixed(1)}% relevance match`;
};

const parseFounderDetails = (
  details: CompanyMatch["founder_details"]
): FounderDetail[] => {
  if (!details) return [];
  if (Array.isArray(details)) return details as FounderDetail[];
  if (typeof details === "string") {
    try {
      const parsed = JSON.parse(details);
      return Array.isArray(parsed) ? (parsed as FounderDetail[]) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const dedupeStrings = (values: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const key = value.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  });
  return result;
};

const getCompanyEmails = (company: CompanyMatch) => {
  const singleEmails = [
    company.published_company_email,
    company.company_email,
    company.support_email,
    company.contact_email,
    company.general_email,
  ].filter((email): email is string => !!email && email.trim().length > 0);

  const multiEmails = [company.emails, company.company_emails]
    .filter((emails): emails is string[] => Array.isArray(emails))
    .flat()
    .filter((email): email is string => typeof email === "string");

  const trimmed = [...singleEmails, ...multiEmails]
    .map((email) => email.trim())
    .filter((email) => email.length > 0);

  return dedupeStrings(trimmed);
};

const buildFallbackFounders = (company: CompanyMatch): FounderDetail[] => {
  const names = Array.isArray(company.founders_names)
    ? company.founders_names
    : [];
  const emails = Array.isArray(company.founder_emails)
    ? company.founder_emails
    : [];
  const linkedins = Array.isArray(company.founder_linkedin_urls)
    ? company.founder_linkedin_urls
    : [];

  const longest = Math.max(names.length, emails.length, linkedins.length);
  if (longest === 0) return [];

  return Array.from({ length: longest }).map((_, index) => ({
    name: names[index],
    verified_email: emails[index],
    linkedin_url: linkedins[index],
  }));
};

export default function LeadsRequestPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<CompanyMatch[]>([]);
  const [strategy, setStrategy] = useState<Record<string, unknown> | null>(
    null
  );
  const [lastQuery, setLastQuery] = useState("");
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeFilters = useMemo(() => {
    if (!strategy) return [] as [string, unknown][];
    return Object.entries(strategy).filter(([key, value]) => {
      if (HIDDEN_STRATEGY_KEYS.has(key)) return false;
      if (value === undefined || value === null) return false;
      if (typeof value === "string") return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "number") return true;
      if (typeof value === "boolean") return true;
      return false;
    });
  }, [strategy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setCompanies([]);
    setStrategy(null);
    setMatchCount(null);
    setLastQuery("");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data: LeadsApiResponse = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Failed to generate leads");
      }

      setCompanies(data.matches ?? []);
      setStrategy(data.strategy ?? null);
      setMatchCount(
        typeof data.match_count === "number"
          ? data.match_count
          : data.matches?.length ?? 0
      );
      setLastQuery(data.original_query ?? query);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to process request"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-16 md:pt-24 p-4 bg-background">
      <div className="w-full max-w-5xl space-y-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Lead Generation</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
            Find Your Perfect Sales Leads
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto text-balance">
            Describe what type of companies you're looking for, and our AI will
            curate targeted tech sales leads for you.
          </p>
        </div>

        <div className="bg-card border-2 border-primary/30 rounded-2xl p-6 md:p-8 shadow-lg shadow-primary/5">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label
                htmlFor="query"
                className="text-sm font-medium text-foreground"
              >
                Describe Your Ideal Leads
              </label>
              <Textarea
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Example: Find me small to medium sized companies in the Bay Area that could benefit from custom cloud computing pricing prediction software..."
                className="min-h-[160px] text-base resize-none border-2 border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Be as specific as possible about company size, location,
                industry, and needs
              </p>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading || !query.trim()}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Searching YC companies...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Generate Leads
                </>
              )}
            </Button>
          </form>

          {loading && (
            <div className="mt-6 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-sm text-primary">
              Parsing your query, extracting filters, and retrieving matching YC
              companies...
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-destructive/5 rounded-lg border-2 border-destructive/40 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <section className="space-y-6">
          {companies.length > 0 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Showing {matchCount ?? companies.length} matches
                </p>
                <div className="space-y-1">
                  <h2 className="text-3xl font-semibold tracking-tight">
                    Company intelligence for "{lastQuery}"
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Each card highlights AI-enriched YC company data so you can
                    qualify leads at a glance.
                  </p>
                </div>
              </div>

              {activeFilters.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activeFilters.map(([key, value]) => (
                    <Badge key={key} variant="outline" className="text-xs">
                      <span className="font-semibold mr-1">
                        {formatFilterLabel(key)}:
                      </span>
                      {formatFilterValue(value)}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {companies.map((company, index) => {
                  const websiteUrl = normalizeUrl(company.website);
                  const linkedinUrl = normalizeUrl(company.linkedin_url);
                  const parsedFounders = parseFounderDetails(
                    company.founder_details
                  );
                  const combinedFounders =
                    parsedFounders.length > 0
                      ? parsedFounders
                      : buildFallbackFounders(company);
                  const founderContacts = combinedFounders
                    .map((founder) => ({
                      name: founder.name,
                      title: founder.title,
                      email:
                        typeof founder.verified_email === "string"
                          ? founder.verified_email.trim()
                          : null,
                      normalizedLinkedIn: normalizeUrl(
                        founder.linkedin_url || null
                      ),
                    }))
                    .filter(
                      (founder) => founder.email || founder.normalizedLinkedIn
                    );
                  const companyEmails = getCompanyEmails(company);

                  return (
                    <Card
                      key={
                        company.id ||
                        company.company_id ||
                        `${company.company_name}-${index}`
                      }
                      className="border-primary/20 shadow-lg shadow-primary/5 transition-colors hover:border-primary/60"
                    >
                      <CardHeader className="pb-0 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <CardTitle className="text-2xl">
                              {company.company_name || "Untitled Company"}
                            </CardTitle>
                            {company.short_description && (
                              <CardDescription>
                                {company.short_description}
                              </CardDescription>
                            )}
                          </div>
                          {company.batch && (
                            <Badge variant="secondary" className="uppercase">
                              {company.batch}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4 pt-4">
                        {company.ai_reason && (
                          <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                            <Sparkles className="h-4 w-4 text-primary shrink-0" />
                            <p className="text-primary/90">
                              {company.ai_reason}
                            </p>
                          </div>
                        )}

                        {company.tags && company.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {company.tags.slice(0, 6).map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="capitalize"
                              >
                                {tag.replace(/-/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <dl className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <dt className="text-muted-foreground flex items-center gap-1 text-xs uppercase tracking-wide">
                              <MapPin className="h-3.5 w-3.5" /> Location
                            </dt>
                            <dd className="font-semibold">
                              {company.location ||
                                company.country ||
                                "Not specified"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground flex items-center gap-1 text-xs uppercase tracking-wide">
                              <Target className="h-3.5 w-3.5" /> Status
                            </dt>
                            <dd className="font-semibold">
                              {company.status || "Unknown"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground flex items-center gap-1 text-xs uppercase tracking-wide">
                              <Users className="h-3.5 w-3.5" /> Team Size
                            </dt>
                            <dd className="font-semibold">
                              {company.team_size ?? "N/A"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground flex items-center gap-1 text-xs uppercase tracking-wide">
                              <Users className="h-3.5 w-3.5" /> Founders
                            </dt>
                            <dd className="font-semibold">
                              {company.num_founders ?? "N/A"}
                            </dd>
                          </div>
                        </dl>

                        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm space-y-4">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                            <UserRound className="h-4 w-4" /> Contact Intel
                          </div>

                          <div className="space-y-3">
                            <div>
                              <p className="flex items-center gap-2 font-semibold">
                                <Mail className="h-4 w-4" /> Company Emails
                              </p>
                              {companyEmails.length > 0 ? (
                                <ul className="mt-2 space-y-1">
                                  {companyEmails.map((email) => (
                                    <li key={email}>
                                      <a
                                        href={`mailto:${email}`}
                                        className="text-primary hover:underline break-all"
                                      >
                                        {email}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Not provided
                                </p>
                              )}
                            </div>

                            <div>
                              <p className="flex items-center gap-2 font-semibold">
                                <UserRound className="h-4 w-4" /> Founder Info
                              </p>
                              {founderContacts.length > 0 ? (
                                <ul className="mt-2 space-y-3">
                                  {founderContacts
                                    .slice(0, 3)
                                    .map((founder, founderIndex) => (
                                      <li
                                        key={`founder-${
                                          founder.name || founderIndex
                                        }`}
                                        className="rounded-lg border border-primary/20 bg-background/80 p-3"
                                      >
                                        <p className="font-semibold">
                                          {founder.name ||
                                            `Founder ${founderIndex + 1}`}
                                        </p>
                                        {founder.title && (
                                          <p className="text-xs text-muted-foreground">
                                            {founder.title}
                                          </p>
                                        )}
                                        <div className="mt-2 flex flex-wrap gap-3 text-sm">
                                          {founder.email && (
                                            <a
                                              href={`mailto:${founder.email}`}
                                              className="inline-flex items-center gap-1 text-primary hover:underline break-all"
                                            >
                                              <Mail className="h-4 w-4" />
                                              {founder.email}
                                            </a>
                                          )}
                                          {founder.normalizedLinkedIn && (
                                            <a
                                              href={founder.normalizedLinkedIn}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center gap-1 text-primary hover:underline"
                                            >
                                              <Linkedin className="h-4 w-4" />
                                              LinkedIn
                                            </a>
                                          )}
                                        </div>
                                      </li>
                                    ))}
                                </ul>
                              ) : (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  No founder emails or LinkedIns provided.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>

                      <CardFooter className="flex flex-col gap-3 border-t pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-muted-foreground">
                          {getScoreLabel(company.score)}
                        </span>

                        <div className="flex flex-wrap gap-2">
                          {websiteUrl && (
                            <Button asChild variant="outline" size="sm">
                              <a
                                href={websiteUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1"
                              >
                                <ExternalLink className="h-4 w-4" /> Visit Site
                              </a>
                            </Button>
                          )}
                          {linkedinUrl && (
                            <Button asChild variant="ghost" size="sm">
                              <a
                                href={linkedinUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1"
                              >
                                <Linkedin className="h-4 w-4" /> LinkedIn
                              </a>
                            </Button>
                          )}
                        </div>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {!loading && lastQuery && companies.length === 0 && !error && (
            <div className="rounded-2xl border-2 border-dashed border-muted-foreground/40 p-8 text-center">
              <p className="text-xl font-semibold">
                No companies matched "{lastQuery}" yet
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Try refining your query with specific industries, team sizes, or
                regions for better results.
              </p>
            </div>
          )}
        </section>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            Powered by advanced AI to help you discover high-quality sales
            opportunities
          </p>
        </div>
      </div>
    </div>
  );
}
