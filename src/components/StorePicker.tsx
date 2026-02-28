// components/StorePicker.tsx
'use client';
import React, { useState } from 'react';
import { Store as StoreIcon, Check, X } from 'lucide-react';

type Store = { id: number; name: string };

export default function StorePicker({ stores, onPick, onCancel }:{
  stores: Store[]; onPick: (id: number) => void; onCancel?: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm z-[100] p-4 animate-in">
      <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md border border-border relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <StoreIcon size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Select Outlet</h2>
          </div>
          {onCancel && (
            <button 
              onClick={onCancel} 
              className="p-2 hover:bg-secondary rounded-xl text-muted-foreground transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-6 font-medium">
          Please choose which outlet you would like to manage right now.
        </p>

        <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
          {stores.map(s => (
            <button
              key={s.id}
              onClick={() => setSelected(Number(s.id))}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 group text-left ${
                selected === Number(s.id)
                  ? 'border-primary bg-primary/5 shadow-md shadow-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-slate-50'
              }`}
            >
              <div className="flex flex-col">
                <span className={`font-bold transition-colors ${selected === Number(s.id) ? 'text-primary' : 'text-slate-700'}`}>
                  {s.name}
                </span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                  ID: {s.id}
                </span>
              </div>
              
              <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                selected === Number(s.id) 
                  ? 'bg-primary text-white scale-100' 
                  : 'bg-secondary text-transparent scale-75 group-hover:bg-primary/20'
              }`}>
                <Check size={14} />
              </div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8">
          <button 
            onClick={onCancel} 
            className="px-6 py-3 rounded-2xl bg-secondary text-slate-700 hover:bg-slate-200 transition-all font-bold text-sm active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={() => selected !== null && onPick(selected)}
            disabled={selected === null}
            className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg active:scale-95 ${
              selected === null
                ? 'bg-primary/30 text-white cursor-not-allowed shadow-none'
                : 'bg-primary text-white hover:bg-blue-600 shadow-primary/25'
            }`}
          >
            Switch Now
          </button>
        </div>
      </div>
    </div>
  );
}
