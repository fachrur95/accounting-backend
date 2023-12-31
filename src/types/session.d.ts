import { Institute, Prisma, TokenType, User } from "@prisma/client";

export interface Session {
  institute?: string;
  unit?: string;
}

export interface PayloadData {
  userId: string;
  session?: Session;
  iat?: number;
  exp?: number;
  type?: TokenType;
}

type UnitWithInclude = Prisma.UnitGetPayload<{
  include: {
    GeneralSetting: true,
  }
}>
export interface ICashRegister {
  id: string;
  name: string;
  transactionId: string;
  transactionNumber: string;
  openDate: Date,
  openedBy: string;
}

export interface SessionData extends User {
  session?: {
    institute?: Institute,
    unit?: Prisma.UnitGetPayload,
    cashRegister?: ICashRegister | null,
  }
}