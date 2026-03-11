export type NOAASolarWindResponse = string[][];

export type NOAAKpIndexResponse = string[][];

export interface NOAAAlertItem {
  issue_datetime: string;
  message: string;
}

export type NOAAAlertResponse = NOAAAlertItem[];

export interface NormalizedSolarWind {
  externalId: string;
  timeTag: string;
  density: number | null;
  speed: number | null;
  temperature: number | null;
  recordedAt: Date;
}

export interface NormalizedKpIndex {
  externalId: string;
  timeTag: string;
  kp: number | null;
  kpFraction: number | null;
  recordedAt: Date;
}

export interface NormalizedSpaceWeatherAlert {
  externalId: string;
  issueTime: string;
  message: string;
  recordedAt: Date;
}
