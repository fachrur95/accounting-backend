import { Institute, Unit, User } from "@prisma/client";

export interface Session {
  institution?: string;
  unit?: string;
}

export interface PayloadData {
  userId: string;
  session?: Session;
}

export interface SessionData extends User {
  session?: {
    institute?: Institute,
    unit?: Unit,
  }
}