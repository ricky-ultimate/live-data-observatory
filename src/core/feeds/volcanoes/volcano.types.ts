export interface USGSVolcano {
  volcanoName: string;
  vnum: string;
  volcanoCd: string;
  colorCode: "GREEN" | "YELLOW" | "ORANGE" | "RED" | "UNASSIGNED" | null;
  alertLevel: "NORMAL" | "ADVISORY" | "WATCH" | "WARNING" | "UNASSIGNED" | null;
  latitude: number | null;
  longitude: number | null;
  state: string | null;
  region: string | null;
  updateTime: string | null;
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
