"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  perPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  perPage,
  totalItems,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  const limits = [10, 20, 50, 100];

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-4 bg-white border-t border-slate-100">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rows per page</span>
          <select
            value={perPage}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
          >
            {limits.map((limit) => (
              <option key={limit} value={limit}>
                {limit}
              </option>
            ))}
          </select>
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-l border-slate-100 pl-4">
          Showing <span className="text-slate-900">{(currentPage - 1) * perPage + 1}</span> to{" "}
          <span className="text-slate-900">{Math.min(currentPage * perPage, totalItems)}</span> of{" "}
          <span className="text-slate-900">{totalItems}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-slate-200 transition-all active:scale-95"
          title="Previous Page"
        >
          <ChevronLeft size={18} />
        </button>
        
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            // Simple window logic for pagination
            let pageNum = i + 1;
            if (totalPages > 5 && currentPage > 3) {
              pageNum = currentPage - 2 + i;
            }
            if (pageNum > totalPages) return null;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-black transition-all ${
                  currentPage === pageNum
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                    : "text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-100"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="p-2 border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-slate-200 transition-all active:scale-95"
          title="Next Page"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
