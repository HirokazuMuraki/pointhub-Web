import React from "react";

export const HistoryList = ({ transactions, styles }: any) => (
  <div className="space-y-4">
    <h2 className={styles.sectionTitle}>📋 履歴一覧</h2>
    {transactions.length > 0 ? (
      transactions.map((t: any) => (
        <div key={t.id} className="bg-white p-6 rounded-3xl border border-slate-100 flex justify-between items-center shadow-sm">
          <div>
            <p className="text-xs text-slate-400 font-bold mb-1">{new Date(t.createdAt).toLocaleString()}</p>
            <p className="font-black text-slate-800 text-lg">{t.fromServiceName} ➔ {t.toServiceName}</p>
          </div>
          <p className="text-2xl font-black text-blue-600">{t.amount.toLocaleString()} pt</p>
        </div>
      ))
    ) : (
      <div className="bg-white p-10 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400 font-bold">
        取引履歴はまだありません
      </div>
    )}
  </div>
);
