"use client";

import { useMemo, useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface DataPreviewTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  pageSize?: number;
  /** When provided, an "Acciones" column with a discard button is appended to every row. */
  onDeleteRow?: (row: TData) => void;
  deleteAriaLabel?: string;
}

export function DataPreviewTable<TData>({
  columns,
  data,
  pageSize = 25,
  onDeleteRow,
  deleteAriaLabel = "Descartar fila",
}: DataPreviewTableProps<TData>) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });

  const tableColumns = useMemo<ColumnDef<TData, unknown>[]>(() => {
    if (!onDeleteRow) return columns;
    return [
      ...columns,
      {
        id: "__actions__",
        header: "",
        cell: (c) => (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={deleteAriaLabel}
            onClick={() => onDeleteRow(c.row.original)}
          >
            <Trash2 className="text-destructive size-4" />
          </Button>
        ),
      },
    ];
  }, [columns, onDeleteRow, deleteAriaLabel]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={tableColumns.length} className="text-muted-foreground h-24 text-center">
                  Sin datos para mostrar.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Página {table.getState().pagination.pageIndex + 1} de {Math.max(table.getPageCount(), 1)} ·{" "}
          {data.length} fila{data.length === 1 ? "" : "s"}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
