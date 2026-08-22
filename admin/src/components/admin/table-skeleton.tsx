import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  // Generate varied widths for more realistic skeleton
  const getRandomWidth = (index: number) => {
    const widths = ["w-20", "w-24", "w-32", "w-28", "w-16", "w-36", "w-40"];
    return widths[index % widths.length];
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {Array.from({ length: columns }).map((_, index) => (
            <TableHead key={index}>
              <Skeleton className={`h-4 ${getRandomWidth(index)}`} />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {Array.from({ length: columns }).map((_, colIndex) => {
              // Vary the skeleton heights and widths for more realistic look
              const isFirstColumn = colIndex === 0;
              const isLastColumn = colIndex === columns - 1;

              return (
                <TableCell key={colIndex}>
                  {isFirstColumn ? (
                    // First column - often has images or icons
                    <Skeleton className="h-10 w-10 rounded-md" />
                  ) : isLastColumn ? (
                    // Last column - often has action buttons
                    <Skeleton className="h-8 w-16 rounded-md" />
                  ) : (
                    // Regular columns - varied widths
                    <Skeleton
                      className={`h-4 ${getRandomWidth(colIndex + rowIndex)}`}
                    />
                  )}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
