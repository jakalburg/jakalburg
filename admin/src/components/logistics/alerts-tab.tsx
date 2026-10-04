"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Check, ExternalLink, Inbox, Search, X } from "lucide-react";
import {
  useNotificationsPage,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  type Notification,
  type NotificationFilters,
} from "@/hooks/use-notifications";
import { useDebounce } from "@/hooks/use-debounce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TableSkeleton } from "@/components/admin/table-skeleton";
import {
  TablePagination,
  TABLE_PAGE_SIZE,
} from "@/components/admin/table-pagination";
import { cn } from "@/lib/utils";

/** Read state tabs. "Unread" leads — it's the only one that needs action. */
const STATUS_TABS = [
  { label: "Unread", value: "unread" },
  { label: "All", value: "all" },
  { label: "Read", value: "read" },
] as const;

type StatusValue = (typeof STATUS_TABS)[number]["value"];

/**
 * Only the types the server actually raises. Listing a type that can never
 * appear would give a filter that always returns nothing.
 */
const TYPE_OPTIONS = [
  { label: "All types", value: "all" },
  { label: "New orders", value: "order_placed" },
  { label: "Shipped", value: "order_shipped" },
  { label: "Cancelled", value: "order_cancelled" },
] as const;

/**
 * Presets rather than a date picker: an alerts log is read as "what happened
 * recently", and two calendar fields to answer that is more work than it's
 * worth. The API takes a real ISO range, so a picker can be added later
 * without touching the server.
 */
const PERIOD_OPTIONS = [
  { label: "All time", value: "all", days: null },
  { label: "Last 24 hours", value: "1", days: 1 },
  { label: "Last 7 days", value: "7", days: 7 },
  { label: "Last 30 days", value: "30", days: 30 },
] as const;

type PeriodValue = (typeof PERIOD_OPTIONS)[number]["value"];

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  order_placed: {
    label: "New order",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  order_shipped: {
    label: "Shipped",
    className: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  order_cancelled: {
    label: "Cancelled",
    className: "bg-red-500/10 text-red-600 border-red-500/20",
  },
};

function TypeBadge({ type }: { type: string }) {
  const meta = TYPE_BADGE[type];
  return (
    <Badge
      variant="outline"
      className={cn(
        "whitespace-nowrap text-[10px]",
        meta?.className ?? "bg-muted text-muted-foreground",
      )}
    >
      {meta?.label ?? type.replace(/_/g, " ")}
    </Badge>
  );
}

export function AlertsTab() {
  const [status, setStatus] = useState<StatusValue>("unread");
  const [type, setType] = useState<string>("all");
  const [period, setPeriod] = useState<PeriodValue>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 300);

  // The span, not a timestamp — the hook turns it into a `from` at fetch time,
  // so the window is always measured from the request rather than from
  // whenever this tab happened to be opened.
  const withinDays =
    PERIOD_OPTIONS.find((p) => p.value === period)?.days ?? null;

  const filters: NotificationFilters = {
    status,
    type,
    search: debouncedSearch.trim() || undefined,
    withinDays,
    page,
    limit: TABLE_PAGE_SIZE,
  };

  const { data, isLoading, isError, isPlaceholderData } =
    useNotificationsPage(filters);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const unreadTotal = data?.unreadTotal ?? 0;

  // `isPlaceholderData` means these rows still belong to the previous page or
  // filter, so show the skeleton until the page actually asked for arrives.
  const isPageLoading = isLoading || isPlaceholderData;

  // Narrowing the table invalidates the current page number — page 4 of the
  // old result set is meaningless against the new one. Done in the handlers
  // rather than an effect so there's no second render pass to correct it.
  const changeStatus = (value: StatusValue) => {
    setStatus(value);
    setPage(1);
  };
  const changeType = (value: string) => {
    setType(value);
    setPage(1);
  };
  const changePeriod = (value: PeriodValue) => {
    setPeriod(value);
    setPage(1);
  };
  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const filtersActive =
    status !== "unread" || type !== "all" || period !== "all" || !!search;

  const clearFilters = () => {
    setStatus("unread");
    setType("all");
    setPeriod("all");
    setSearch("");
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Alerts</CardTitle>
          <CardDescription>
            Every order event the store has raised. Preferences for what gets
            recorded live in Settings → Notifications.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending || unreadTotal === 0}
          className="shrink-0"
        >
          <Check className="mr-2 h-4 w-4" />
          Mark all read
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-1 rounded-md border p-1">
            {STATUS_TABS.map((tab) => (
              <Button
                key={tab.value}
                variant={status === tab.value ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => changeStatus(tab.value)}
              >
                {tab.label}
                {/* The count is the global outstanding total, so it doesn't
                    move as the other filters narrow the table. */}
                {tab.value === "unread" && unreadTotal > 0 && (
                  <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                    {unreadTotal}
                  </span>
                )}
              </Button>
            ))}
          </div>

          <div className="relative flex-1 lg:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => changeSearch(e.target.value)}
              placeholder="Order number or customer"
              className="h-9 pl-8"
            />
          </div>

          <Select value={type} onValueChange={changeType}>
            <SelectTrigger className="h-9 w-full lg:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={period}
            onValueChange={(v) => changePeriod(v as PeriodValue)}
          >
            <SelectTrigger className="h-9 w-full lg:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filtersActive && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 shrink-0 text-xs"
              onClick={clearFilters}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>

        {isPageLoading ? (
          <TableSkeleton rows={TABLE_PAGE_SIZE} columns={4} />
        ) : isError ? (
          <EmptyState
            title="Couldn't load alerts"
            hint="The alerts table may not exist yet — run the pending database migration on the server."
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title={
              filtersActive ? "No alerts match these filters" : "No alerts yet"
            }
            hint={
              filtersActive
                ? "Try widening the period or clearing the search."
                : "Order events will appear here as they happen."
            }
          />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden rounded-md border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[170px]">Date</TableHead>
                    <TableHead className="w-[120px]">Type</TableHead>
                    <TableHead>Alert</TableHead>
                    <TableHead className="w-[100px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={cn(!row.isRead && "bg-muted/40")}
                    >
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatWhen(row.createdAt)}
                      </TableCell>
                      <TableCell>
                        <TypeBadge type={row.type} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {!row.isRead && (
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                              aria-label="Unread"
                            />
                          )}
                          <div className="min-w-0">
                            <p
                              className={cn(
                                "truncate text-sm",
                                !row.isRead && "font-medium",
                              )}
                            >
                              {row.title}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {row.message}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <RowActions row={row} onMarkRead={markRead.mutate} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <div className="grid gap-3 md:hidden">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className={cn(
                    "rounded-lg border p-4",
                    !row.isRead && "bg-muted/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {formatWhen(row.createdAt)}
                    </p>
                    <TypeBadge type={row.type} />
                  </div>
                  <p
                    className={cn("mt-3 text-sm", !row.isRead && "font-medium")}
                  >
                    {row.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.message}
                  </p>
                  <div className="mt-3 flex gap-2">
                    {!row.isRead && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => markRead.mutate(row.id)}
                      >
                        <Check className="mr-1 h-4 w-4" />
                        Mark read
                      </Button>
                    )}
                    {row.link && (
                      <Button
                        variant="outline"
                        size="sm"
                        className={row.isRead ? "w-full" : "flex-1"}
                        asChild
                      >
                        <Link href={row.link}>
                          <ExternalLink className="mr-1 h-4 w-4" />
                          View order
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Outside the branches above so the page you clicked keeps its
            highlight while the rows load, instead of vanishing with them. */}
        {!isError && !isLoading && (
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
            itemLabel="alerts"
          />
        )}
      </CardContent>
    </Card>
  );
}

function RowActions({
  row,
  onMarkRead,
}: {
  row: Notification;
  onMarkRead: (id: string) => void;
}) {
  return (
    <div className="flex justify-end gap-1">
      {!row.isRead && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onMarkRead(row.id)}
          title="Mark read"
        >
          <Check className="h-4 w-4" />
          <span className="sr-only">Mark read</span>
        </Button>
      )}
      {row.link && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          asChild
          title="View order"
        >
          <Link href={row.link}>
            <ExternalLink className="h-4 w-4" />
            <span className="sr-only">View order</span>
          </Link>
        </Button>
      )}
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-14 text-center">
      <Inbox className="mb-3 h-10 w-10 text-muted-foreground/30" />
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/** Today's alerts read better as a time; older ones need the date. */
function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const isToday = new Date().toDateString() === date.toDateString();
  return isToday
    ? `Today, ${format(date, "HH:mm")}`
    : format(date, "dd MMM yyyy, HH:mm");
}
