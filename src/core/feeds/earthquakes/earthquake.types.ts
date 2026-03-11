export interface USGSFeatureProperties {
  mag: number;
  place: string;
  time: number;
  updated: number;
  status: string;
  tsunami: number;
  sig: number;
  type: string;
  title: string;
}

export interface USGSFeature {
  type: "Feature";
  id: string;
  geometry: {
    type: "Point";
    coordinates: [number, number, number];
  };
  properties: USGSFeatureProperties;
}

export interface USGSGeoJSONResponse {
  type: "FeatureCollection";
  metadata: {
    generated: number;
    url: string;
    title: string;
    count: number;
  };
  features: USGSFeature[];
}

export interface NormalizedEarthquake {
  externalId: string;
  magnitude: number;
  place: string;
  lat: number;
  lng: number;
  depth: number;
  tsunami: boolean;
  significance: number;
  recordedAt: Date;
}
