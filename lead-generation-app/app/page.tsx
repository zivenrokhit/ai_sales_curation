"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send } from "lucide-react";

export default function LeadsRequestPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();
      setResponse(data.message || "Request received");
    } catch (error) {
      setResponse("Failed to process request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-16 md:pt-24 p-4 bg-background">
      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Lead Generation</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
            Find Your Perfect Sales Leads
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
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
                  Processing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Generate Leads
                </>
              )}
            </Button>
          </form>

          {response && (
            <div className="mt-6 p-4 bg-primary/10 rounded-lg border-2 border-primary/30">
              <p className="text-sm text-primary font-medium">{response}</p>
            </div>
          )}
        </div>

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
