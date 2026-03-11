export interface GDELTArticle {
  url: string;
  url_mobile: string;
  title: string;
  seendate: string;
  socialimage: string;
  domain: string;
  language: string;
  sourcecountry: string;
}

export interface GDELTArticleResponse {
  articles: GDELTArticle[] | null;
}

export interface NormalizedConflictArticle {
  externalId: string;
  title: string;
  url: string;
  domain: string;
  sourcecountry: string;
  language: string;
  seendate: string;
  recordedAt: Date;
}
