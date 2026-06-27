export interface ApiError {
  detail: string;
  code: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface TokenResponse {
  token: string;
  token_type: string;
}
