export interface Session {
  institution: number | null;
  unit: number | null;
}

export interface SessionData {
  userId: number;
  session?: Session;
}