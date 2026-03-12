export interface USGSVolcano {
  volcano_name: string;
  vnum: string;
  color_code: "GREEN" | "YELLOW" | "ORANGE" | "RED" | "UNASSIGNED" | null;
  alert_level: "NORMAL" | "ADVISORY" | "WATCH" | "WARNING" | "UNASSIGNED" | null;
  obs_fullname: string;
  obs_abbr: string;
  sent_utc: string;
  sent_unixtime: number;
  notice_url: string;
  notice_data: string;
}

export type USGSVolcanoResponse = USGSVolcano[];

export interface NormalizedVolcano {
  externalId: string;
  name: string;
  vnum: string;
  colorCode: string | null;
  alertLevel: string | null;
  lat: number | null;
  lng: number | null;
  state: string | null;
  region: string | null;
  updatedAt: string | null;
  recordedAt: Date;
}
