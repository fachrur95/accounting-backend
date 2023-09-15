export interface TokenResponse {
  token: string;
  expires: Date;
}

export interface AuthTokensResponse {
  access: TokenResponse;
  refresh?: TokenResponse;
}

export interface PaginationResponse<T> {
  currentPage: number | null;
  totalPages: number;
  nextPage: boolean;
  countRows: number;
  countAll: number;
  rows: T[];
}