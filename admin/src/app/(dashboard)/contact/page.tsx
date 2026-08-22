"use client";

import { useState, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { InboxIcon, Mail, Users2 } from "lucide-react";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  type: string;
  status: string;
  createdAt: string;
}

function ContactContent() {
  const api = useAxiosAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("contact_us");

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["contacts", activeTab],
    queryFn: async () => {
      const { data } = await api.get(`/contact?type=${activeTab}`);
      return data as Contact[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.patch(`/contact/${id}/status`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", activeTab] });
      toast.success("Status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  const renderContacts = (contacts: Contact[] | undefined) => {
    if (isLoading) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          Loading submissions...
        </div>
      );
    }

    if (!contacts || contacts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <InboxIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-lg mb-1">No Submissions Found</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            There are no messages in this inbox yet.
          </p>
        </div>
      );
    }

    return (
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              {activeTab !== "newsletter" && <TableHead>Name</TableHead>}
              <TableHead>Email</TableHead>
              {activeTab === "contact_us" && <TableHead>Subject</TableHead>}
              {activeTab !== "newsletter" && <TableHead>Message</TableHead>}
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="whitespace-nowrap">
                  {format(new Date(contact.createdAt), "MMM d, yyyy h:mm a")}
                </TableCell>
                {activeTab !== "newsletter" && (
                  <TableCell>
                    <div className="font-medium">{contact.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {contact.email}
                    </div>
                  </TableCell>
                )}
                {activeTab === "newsletter" && (
                  <TableCell className="font-medium">{contact.email}</TableCell>
                )}
                {activeTab === "contact_us" && (
                  <TableCell className="font-medium">
                    {contact.subject || "-"}
                  </TableCell>
                )}
                {activeTab !== "newsletter" && (
                  <TableCell>
                    <div
                      className="max-w-md line-clamp-2 text-sm"
                      title={contact.message}
                    >
                      {contact.message}
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <Select
                    defaultValue={contact.status}
                    onValueChange={(value) =>
                      updateStatusMutation.mutate({
                        id: contact.id,
                        status: value,
                      })
                    }
                  >
                    <SelectTrigger className="w-[110px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unread">
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                          Unread
                        </div>
                      </SelectItem>
                      <SelectItem value="read">
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-slate-300 mr-2" />
                          Read
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contact Inbox</h1>
          <p className="text-muted-foreground mt-2">
            View and manage customer inquiries.
          </p>
        </div>
      </div>

      <Tabs defaultValue="contact_us" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-[520px]">
          <TabsTrigger value="contact_us" className="gap-2">
            <Mail className="h-4 w-4" />
            Contact Us
          </TabsTrigger>
          <TabsTrigger value="get_in_touch" className="gap-2">
            <InboxIcon className="h-4 w-4" />
            Get In Touch
          </TabsTrigger>
          <TabsTrigger value="newsletter" className="gap-2">
            <Users2 className="h-4 w-4" />
            Newsletter
          </TabsTrigger>
        </TabsList>
        <div className="mt-6">
          <TabsContent value="contact_us" className="mt-0">
            {renderContacts(contacts)}
          </TabsContent>
          <TabsContent value="get_in_touch" className="mt-0">
            {renderContacts(contacts)}
          </TabsContent>
          <TabsContent value="newsletter" className="mt-0">
            {renderContacts(contacts)}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export default function ContactPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <ContactContent />
    </Suspense>
  );
}
