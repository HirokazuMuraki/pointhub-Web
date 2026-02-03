import React, { useState, useMemo } from "react";

export const HistoryList = ({ transactions, allUsers, isAdmin, styles }: any) => {
  const [searchName, setSearchName] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  const getUserDisplayName = (email: string) => {
    const user = allUsers?.find((u: any) => u.email === email);
    return {
      name: user?.name || "未設定",
      full: user?.name ? `${user.name} (${email})` : email
    };
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t: any) => {
      const user = getUserDisplayName(t.userEmail);
      const tDate = new Date(t.createdAt).toISOString().split('T')[0];
      const amount = t.amount;

      if (searchName && !user.name.includes(searchName)) return false;
      if (searchEmail && !t.userEmail.includes(searchEmail)) return false;
      if (startDate && tDate < startDate) return false;
      if (endDate && tDate > endDate) return false;
      if (minAmount && amount < parseInt(minAmount)) return false;
      if (maxAmount && amount > parseInt(maxAmount)) return false;

      return true;
    });
  }, [transactions, searchName, searchEmail, startDate, endDate, minAmount, maxAmount, allUsers]);

  // CSVダウンロード機能
  const downloadCSV = () => {
    if (filteredTransactions.length === 0) return alert("出力するデータがありません");

    const headers = ["日時", "利用者名", "メールアドレス", "元サービス", "先サービス", "ポイント数"];
    const rows = filteredTransactions.map((t: any) => [
      new Date(t.createdAt).toLocaleString(),
      getUserDisplayName(t.userEmail).name,
      t.userEmail,
      t.fromServiceName,
      t.toServiceName,
      t.amount
    ]);

    // Excelで開けるようにBOM(Byte Order Mark)を付与
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `history_export_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className={styles.sectionTitle}>📋 履歴一覧 {isAdmin && "(全ユーザー)"}</h2>
        {isAdmin && (
          <button 
            onClick={downloadCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-black text-xs shadow-sm transition-all flex items-center gap-2"
          >
            📥 CSV出力
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="bg-white p-6 rounded-[2rem] border border-blue-100 shadow-sm space-y-4">
          <p className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
            🔍 絞り込み検索
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 ml-1">利用者名</label>
              <input value={searchName} onChange={(e) => setSearchName(e.target.value)} placeholder="名前で検索..." className={styles.input + " text-sm py-2 mb-0"} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 ml-1">メールアドレス</label>
              <input value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} placeholder="メアドで検索..." className={styles.input + " text-sm py-2 mb-0"} />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 ml-1">最小ポイント</label>
                <input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="0" className={styles.input + " text-sm py-2 mb-0"} />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 ml-1">最大ポイント</label>
                <input type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="99999" className={styles.input + " text-sm py-2 mb-0"} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 ml-1">開始日</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={styles.input + " text-sm py-2 mb-0"} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 ml-1">終了日</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={styles.input + " text-sm py-2 mb-0"} />
            </div>
            <div className="flex items-end">
              <button 
                onClick={() => {setSearchName(""); setSearchEmail(""); setStartDate(""); setEndDate(""); setMinAmount(""); setMaxAmount("");}}
                className="w-full py-2 bg-slate-100 text-slate-500 font-bold rounded-xl text-xs hover:bg-slate-200 transition-all"
              >
                リセット
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-bold px-1">該当件数: {filteredTransactions.length} 件</p>
        </div>
      )}

      <div className="space-y-4">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((t: any) => (
            <div key={t.id} className="bg-white p-6 rounded-3xl border border-slate-100 flex justify-between items-center shadow-sm hover:border-blue-200 transition-all">
              <div>
                <p className="text-xs text-slate-400 font-bold mb-1">
                  {new Date(t.createdAt).toLocaleString()}
                  {isAdmin && <span className="ml-2 text-blue-600">● {getUserDisplayName(t.userEmail).full}</span>}
                </p>
                <p className="font-black text-slate-800 text-lg">{t.fromServiceName} ➔ {t.toServiceName}</p>
              </div>
              <p className="text-2xl font-black text-blue-600">{t.amount.toLocaleString()} pt</p>
            </div>
          ))
        ) : (
          <div className="bg-white p-10 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400 font-bold">
            条件に一致する履歴はありません
          </div>
        )}
      </div>
    </div>
  );
};
