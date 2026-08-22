"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/use-notifications";
import { useState } from "react";

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const { data: notifications = [] } = useNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    if (notification.link) {
      setIsOpen(false);
      router.push(notification.link);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 text-xs"
              onClick={() => markAllReadMutation.mutate()}
            >
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`group flex flex-col items-start gap-1 p-3 cursor-pointer ${!notification.isRead ? "bg-muted/30" : ""}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex justify-between w-full">
                  <div
                    className={`font-medium ${!notification.isRead ? "text-foreground" : "text-muted-foreground"} group-focus:text-accent-foreground`}
                  >
                    {notification.title}
                  </div>
                  {!notification.isRead && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 ring-offset-background group-focus:bg-accent-foreground" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2 group-focus:text-accent-foreground">
                  {notification.message}
                </div>
                <div className="text-xs text-muted-foreground mt-1 group-focus:text-accent-foreground">
                  {new Date(notification.createdAt).toLocaleString()}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
