"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

type AlertType = "alert" | "confirm";

const AlertContext = createContext<{
  showAlert: (message: string) => Promise<void>;
  showConfirm: (message: string) => Promise<boolean>;
} | null>(null);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) throw new Error("useAlert must be used within AlertProvider");
  return context;
};

export const AlertProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<{
    message: string;
    type: AlertType;
    resolve: (value: any) => void;
  } | null>(null);

  const showAlert = useCallback((message: string) => {
    return new Promise<void>((resolve) => {
      setState({ message, type: "alert", resolve });
    });
  }, []);

  const showConfirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setState({ message, type: "confirm", resolve });
    });
  }, []);

  const handleAction = (result: boolean) => {
    if (state) {
      state.resolve(result);
      setState(null);
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[1.8rem] shadow-2xl border border-slate-100 w-full max-w-[280px] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">
                {state.type === "confirm" ? "❓" : "🔔"}
              </div>
              <h3 className="text-base font-black text-slate-800 mb-1">
                {state.type === "confirm" ? "確認" : "通知"}
              </h3>
              <p className="text-slate-500 text-xs font-bold leading-relaxed whitespace-pre-wrap">
                {state.message}
              </p>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
              {state.type === "confirm" && (
                <button
                  onClick={() => handleAction(false)}
                  className="flex-1 py-3 bg-white text-slate-400 text-xs font-black rounded-xl border border-slate-200 hover:bg-slate-100 transition-all active:scale-95"
                >
                  キャンセル
                </button>
              )}
              <button
                onClick={() => handleAction(true)}
                className="flex-1 py-3 bg-slate-900 text-white text-xs font-black rounded-xl hover:bg-orange-500 transition-all active:scale-95 shadow-md"
              >
                {state.type === "confirm" ? "実行" : "確認"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};
