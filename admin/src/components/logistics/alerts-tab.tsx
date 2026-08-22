"use client";

import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/hooks/use-notifications";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ExternalLink, Bell, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { TableSkeleton } from "@/components/admin/table-skeleton";
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

const typeColors: Record<string, string> = {
  order_placed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  order_cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  order_shipped: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  low_stock: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
};

export function AlertsTab() {
  const { data: notifications, isLoading } = useNotifications(50);
  const markAllRead = useMarkAllNotificationsRead();
  const markRead = useMarkNotificationRead();

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Notification History</CardTitle>
            <CardDescription>
              View and manage all system and order alerts
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markAllRead.isPending || notifications?.length === 0}
          >
            <Check className="w-4 h-4 mr-2" />
            Mark all read
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={10} columns={5} />
          ) : !notifications || notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Inbox className="w-12 h-12 mb-4 opacity-20" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Date</TableHead>
                      <TableHead className="w-[120px]">Type</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead className="w-[100px] text-right">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.map((notif) => (
                      <TableRow
                        key={notif.id}
                        className={cn(
                          !notif.isRead && "bg-muted/50 font-medium",
                        )}
                      >
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(
                            new Date(notif.createdAt),
                            "MMM dd, yyyy HH:mm",
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "capitalize text-[10px]",
                              typeColors[notif.type] ||
                                "bg-gray-500/10 text-gray-500",
                            )}
                          >
                            {notif.type.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{notif.title}</span>
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {notif.message}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {!notif.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => markRead.mutate(notif.id)}
                                title="Mark read"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                            {notif.link && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                asChild
                                title="View"
                              >
                                <Link href={notif.link}>
                                  <ExternalLink className="w-4 h-4" />
                                </Link>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile View */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {notifications.map((notif) => (
                  <Card
                    key={notif.id}
                    className={cn(!notif.isRead && "bg-muted/50")}
                  >
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        {/* Header: Date and Type Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(notif.createdAt), "MMM dd, HH:mm")}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              "capitalize text-[10px] flex-shrink-0",
                              typeColors[notif.type] ||
                                "bg-gray-500/10 text-gray-500",
                            )}
                          >
                            {notif.type.replace("_", " ")}
                          </Badge>
                        </div>

                        {/* Title and Message */}
                        <div className="border-t pt-3">
                          <p className="text-sm font-medium">{notif.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {notif.message}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                          {!notif.isRead && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => markRead.mutate(notif.id)}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Mark read
                            </Button>
                          )}
                          {notif.link && (
                            <Button
                              variant="outline"
                              size="sm"
                              className={!notif.isRead ? "flex-1" : "w-full"}
                              asChild
                            >
                              <Link href={notif.link}>
                                <ExternalLink className="w-4 h-4 mr-1" />
                                View
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
