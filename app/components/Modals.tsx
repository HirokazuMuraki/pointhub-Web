import React from "react";

export const PolicyModal = ({ content, onClose }: any) => {
  if (!content) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[300] flex items-center justify-center p-4 text-left">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 max-h-[85vh] overflow-y-auto relative shadow-2xl">
        <button onClick={onClose} className="absolute top-8 right-10 text-4xl text-slate-300 font-black hover:text-slate-900 transition-colors">×</button>
        <h3 className="text-2xl font-black mb-8 text-slate-900 border-b-4 border-blue-600 inline-block pb-2">{content.title}</h3>
        <div className="text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">{content.content}</div>
        <button onClick={onClose} className="w-full mt-10 py-4 bg-slate-900 text-white font-black rounded-2xl">閉じる</button>
      </div>
    </div>
  );
};

export const UserHistoryModal = ({ viewingUser, transactions, onClose }: any) => {
  if (!viewingUser) return null;
  const userTransactions = transactions.filter((t: any) => t.userEmail === viewingUser.email);

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[300] flex items-center justify-center p-4 text-left">
      <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 max-h-[80vh] overflow-y-auto relative shadow-2xl">
        <button onClick={onClose} className="absolute top-8 right-10 text-4xl text-slate-300 font-black hover:text-slate-900">×</button>
        <div className="mb-6">
          <p className="text-blue-600 font-black text-xs uppercase tracking-widest">Transaction History</p>
          <h3 className="text-2xl font-black text-slate-900">{viewingUser.name} 様</h3>
          <p className="text-slate-400 text-xs font-bold">{viewingUser.email}</p>
        </div>
        <div className="space-y-4">
          {userTransactions.length > 0 ? (
            userTransactions.map((t: any) => (
              <div key={t.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center border border-slate-100">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold">{new Date(t.createdAt).toLocaleString()}</p>
                  <span className="font-bold text-slate-700">{t.fromServiceName} ➔ {t.toServiceName}</span>
                </div>
                <span className="font-black text-blue-600 text-lg">{t.amount.toLocaleString()}pt</span>
              </div>
            ))
          ) : (
            <p className="text-center py-10 text-slate-400 font-bold italic underline decoration-orange-200">取引履歴はありません</p>
          )}
        </div>
        <button onClick={onClose} className="w-full mt-10 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-lg">閉じる</button>
      </div>
    </div>
  );
};
