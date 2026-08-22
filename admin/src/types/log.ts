export type Severity = "info" | "warning" | "error" | "critical";
export type LogStatus = "unresolved" | "resolved";
export type ErrorSource = "server" | "admin" | "client";

export interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  errorType: string;
  severity: Severity;
  source: ErrorSource;

  endpoint?: string;
  method?: string;
  statusCode?: number;
  requestId: string;

  userId?: string;
  userEmail?: string;
  userName?: string;

  ipAddress?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  networkInfo?: Record<string, unknown>;
  screenSize?: string;
  pageUrl?: string;

  appVersion?: string;
  environment: "development" | "production";

  metadata?: Record<string, unknown>;

  fingerprint: string;
  occurrenceCount: number;
  firstOccurredAt: string;
  lastOccurredAt: string;

  status: LogStatus;
  resolvedAt?: string;
  resolvedByUserId?: string;
  resolvedByName?: string;

  createdAt: string;
  updatedAt: string;
}

export interface ErrorLogListResponse {
  data: ErrorLog[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
}

export interface ErrorLogQueryParams {
  skip?: number;
  take?: number;
  search?: string;
  severity?: string;
  status?: string;
  errorType?: string;
  source?: string;
  endpoint?: string;
  statusCode?: number;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
}
