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

export interface GDELTGeoProperties {
  name: string;
  url: string;
  urltone: number;
  domain: string;
  count: number;
  sharewt: number;
}

export interface GDELTGeoFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: GDELTGeoProperties;
}

export interface GDELTGeoResponse {
  type: "FeatureCollection";
  features: GDELTGeoFeature[] | null;
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

export interface NormalizedConflictGeo {
  externalId: string;
  locationName: string;
  lat: number;
  lng: number;
  url: string;
  domain: string;
  mentionCount: number;
  tone: number;
  recordedAt: Date;
}
