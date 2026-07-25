// Entitas inti Lensa — murni data, tanpa dependency ke framework/infrastruktur.

export interface SourceRow {
  id: number;
  slug: string;
  name: string;
  homepage: string | null;
  character: string | null;
  active: number;
}

export interface FeedRow {
  id: number;
  source_id: number;
  url: string;
  category: string;
  active: number;
  last_fetched_at: string | null;
  last_status: number | null;
  error_count: number;
  etag: string | null;
  last_modified: string | null;
}

export interface ArticleRow {
  id: number;
  source_id: number;
  feed_id: number | null;
  guid: string | null;
  url: string;
  url_hash: string;
  title: string;
  description: string | null;
  image_url: string | null;
  author: string | null;
  category: string;
  published_at: string | null;
  fetched_at: string;
  title_tokens: string | null;
}

export interface NewArticle {
  source_id: number;
  feed_id: number | null;
  guid: string | null;
  url: string;
  url_hash: string;
  title: string;
  description: string | null;
  image_url: string | null;
  author: string | null;
  category: string;
  published_at: string;
  title_tokens: string;
}

export interface StoryRow {
  id: number;
  title: string;
  category: string;
  created_at: string;
  updated_at: string;
  article_count: number;
  source_count: number;
  hot_score: number;
  tokens_json: string | null;
}

export interface AnalysisRow {
  story_id: number;
  neutral_summary: string | null;
  facts_json: string | null;
  perspectives_json: string | null;
  blindspot: string | null;
  method: string;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  generated_at: string;
}

export interface AnalysisUpsert {
  story_id: number;
  neutral_summary: string;
  facts: string[];
  perspectives: Perspective[];
  blindspot: string;
  method: "ai" | "heuristic";
  model: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
}

export interface UserRow {
  id: number;
  email: string;
  created_at: string;
  last_login_at: string | null;
}

export interface Perspective {
  source: string;
  character?: string | null;
  headline: string;
  emphasis: string;
  framing?: string;
  url: string;
}

export interface StoryCard {
  id: number;
  title: string;
  category: string;
  updated_at: string;
  article_count: number;
  source_count: number;
  hot_score: number;
  image_url: string | null;
  summary: string | null;
  sources: { slug: string; name: string }[];
}

export interface IngestResult {
  feedsOk: number;
  feedsSkipped304: number;
  feedsFailed: number;
  articlesNew: number;
  errors: string[];
}
