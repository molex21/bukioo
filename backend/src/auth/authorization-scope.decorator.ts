import { SetMetadata } from "@nestjs/common";

export const AUTHORIZATION_SCOPE_KEY = "authorizationScope";

export interface AuthorizationScope {
  resource: "organization" | "business";
  source: "body" | "params" | "query";
  key: string;
}

export const AuthorizeScope = (scope: AuthorizationScope) =>
  SetMetadata(AUTHORIZATION_SCOPE_KEY, scope);
