export interface JwtPayload {
  sub: string;
  email: string;
  role: "user" | "admin";
  tokenId?: string;
  purpose?: string;
}

export interface AuthContext {
  ip?: string;
  userAgent?: string;
}
