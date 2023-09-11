import { Institute, Unit, User } from "@prisma/client";

export interface Session {
  institution?: number;
  unit?: number;
}

export interface PayloadData {
  userId: number;
  session?: Session;
}

export interface SessionData extends User {
  session?: {
    institute?: Institute,
    unit?: Unit,
  }
}