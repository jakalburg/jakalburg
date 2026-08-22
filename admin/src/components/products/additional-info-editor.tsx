"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AdditionalInfoField {
  id: string;
  key: string;
  value: string;
}

interface AdditionalInfoEditorProps {
  fields: AdditionalInfoField[];
  onChange: (fields: AdditionalInfoField[]) => void;
}

export function AdditionalInfoEditor({
  fields,
  onChange,
}: AdditionalInfoEditorProps) {
  const handleAdd = () => {
    onChange([
      ...fields,
      { id: Math.random().toString(36).substr(2, 9), key: "", value: "" },
    ]);
  };

  const handleRemove = (id: string) => {
    onChange(fields.filter((field) => field.id !== id));
  };

  const handleUpdate = (id: string, key: string, value: string) => {
    onChange(
      fields.map((field) =>
        field.id === id ? { ...field, [key]: value } : field,
      ),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Additional Information</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Field
        </Button>
      </div>

      {fields.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Field Name</TableHead>
                <TableHead className="w-[50%]">Value</TableHead>
                <TableHead className="w-[10%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field) => (
                <TableRow key={field.id}>
                  <TableCell>
                    <Input
                      placeholder="e.g., Material"
                      value={field.key}
                      onChange={(e) =>
                        handleUpdate(field.id, "key", e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="e.g., Cotton"
                      value={field.value}
                      onChange={(e) =>
                        handleUpdate(field.id, "value", e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(field.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">
            No additional information added yet
          </p>
        </div>
      )}
    </div>
  );
}
