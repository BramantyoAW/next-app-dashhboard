// components/StorePicker.tsx
'use client';
import React, { useState } from 'react';
type Store = { id: number; name: string };

export default function StorePicker({ stores, onPick, onCancel }:{
  stores: Store[]; onPick: (id: number) => void; onCancel?: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
      <div className="bg-white rounded-lg p-6 shadow-lg w-96">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Pilih Outlet / Store</h2>
        <div className="space-y-2 max-h-64 overflow-auto">
          {stores.map(s => (
            <div key={s.id}
              onClick={()=>setSelected(Number(s.id))}
              className={`border rounded-md p-3 cursor-pointer ${selected===Number(s.id)?'border-blue-600 bg-blue-50':'hover:bg-gray-50'}`}>
              <p className="font-medium">{s.name}</p>
              <p className="text-xs text-gray-500">ID: {s.id}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300">Batal</button>
          <button
            onClick={()=>selected!==null && onPick(selected)}
            disabled={selected===null}
            className={`px-4 py-2 rounded-lg text-white ${selected===null?'bg-blue-300 cursor-not-allowed':'bg-blue-600 hover:bg-blue-700'}`}>
            Pilih
          </button>
        </div>
      </div>
    </div>
  );
}
