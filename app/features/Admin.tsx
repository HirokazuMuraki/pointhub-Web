"use client";

import { useState, useEffect } from "react";
import { AdminHistory } from "./AdminHistory";

export const AdminPanel = ({ client, styles, services = [], onRefresh }: any) => {
  const [activeAdminTab, setActiveAdminTab] = useState("services"); // "services", "users", "history"
  const [newServiceName, setNewServiceName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newShopId, setNewShopId] = useState("");
  const [newAuthKey, setNewAuthKey] = useState("");
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewData, setViewData] = useState<any>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await client.models.UserProfile.list();
        if (data) setAllProfiles(data);
      } catch (err) {
        console.error("ユーザー取得失敗:", err);
      }
    };
    fetchUsers();
  }, [client]);

  const addService = async () => {
    if (!newServiceName) return alert("サービス名を入力してください");
    setIsProcessing(true);
    try {
      const settings = JSON.stringify({ shopId: newShopId, authKey: newAuthKey });
      await client.models.ServiceMaster.create({
        name: newServiceName,
        type: newServiceName.includes("ダミー") ? "DUMMY" : "SHOPSERVE",
        endpointUrl: "https://api.shopserve.jp/v1",
        connectionSettings: settings,
        description: newDescription || "サービス説明",
        status: "ACTIVE",
        dummyBalance: 300
      });
      setNewServiceName(""); setNewDescription(""); setNewShopId(""); setNewAuthKey("");
      if (onRefresh) await onRefresh();
      alert("新規サービスを登録しました");
    } catch (err) {
      alert("登録に失敗しました。");
    } finally {
      setIsProcessing(false);
    }
  };

  const startView = (service: any) => {
    let settings = { shopId: "", authKey: "" };
    try { settings = JSON.parse(service.connectionSettings || "{}"); } catch(e) {}
    setViewingId(service.id);
    setViewData({ ...service, shopId: settings.shopId, authKey: settings.authKey });
  };

  const deleteService = async (id: string) => {
    if (!confirm("⚠️ 重要：このサービスを削除してもよろしいですか？")) return;
    try {
      await client.models.ServiceMaster.delete({ id });
      if (onRefresh) await onRefresh();
      setViewingId(null);
    } catch (err) {
      console.error("Delete Error:", err);
    }
  };

  return (
    <div className="p-4 lg:p-8">
      {/* 管理者用タブナビゲーション */}
      <div className="flex space-x-2 mb-10 bg-slate-100/50 p-1.5 rounded-2xl w-fit">
        {[
          { id: "services", label: "サービス管理", icon: "⚙️" },
          { id: "users", label: "ユーザー一覧", icon: "👤" },
          { id: "history", label: "交換履歴検索", icon: "🔍" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveAdminTab(tab.id)}
            className={`px-6 py-3 rounded-xl text-xs font-black transition-all flex items-center space-x-2 ${
              activeAdminTab === tab.id 
              ? "bg-white text-slate-900 shadow-sm" 
              : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* コンテンツエリア */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {activeAdminTab === "services" && (
          <div className="space-y-12">
            <section>
              <div className="flex justify-between items-end mb-4">
                <h3 className={styles.sectionTitle}>🏢 サービスマスター登録</h3>
                <div className="hidden md:block bg-blue-50 text-blue-700 px-4 py-2 rounded-xl border border-blue-100 text-[10px] font-bold mb-4">
                  💡 設定変更が必要な場合は、削除した後に再登録してください。
                </div>
              </div>
              <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-inner space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={styles.label}>サービス名 (必須)</label>
                    <input value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} className={styles.input} placeholder="例: ショップサーブ本店" />
                  </div>
                  <div>
                    <label className={styles.label}>サービス説明</label>
                    <input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className={styles.input} placeholder="サービスに関するメモ" />
                  </div>
                  <div>
                    <label className={styles.label}>ショップID</label>
                    <input value={newShopId} onChange={(e) => setNewShopId(e.target.value)} className={styles.input} placeholder="shop-id" />
                  </div>
                  <div>
                    <label className={styles.label}>マスターAPIキー</label>
                    <input type="password" value={newAuthKey} onChange={(e) => setNewAuthKey(e.target.value)} className={styles.input} placeholder="api-key" />
                  </div>
                </div>
                <button onClick={addService} disabled={isProcessing} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-orange-500 transition-all shadow-xl disabled:bg-slate-300">
                  {isProcessing ? "登録中..." : "新規サービスをシステムに登録"}
                </button>
              </div>
            </section>

            <section>
              <h3 className={styles.sectionTitle}>📋 稼働中のサービス一覧</h3>
              <div className="grid grid-cols-1 gap-4">
                {services?.map((s: any) => {
                  let settings = { shopId: "" };
                  try { settings = JSON.parse(s.connectionSettings || "{}"); } catch(e) {}
                  return (
                    <div key={s.id} className="p-6 bg-white rounded-[2rem] border-2 border-slate-50 shadow-sm hover:border-orange-100 transition-all">
                      {viewingId === s.id ? (
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-lg text-[10px] font-black italic">READ ONLY MODE</span>
                            <button onClick={() => setViewingId(null)} className="text-slate-300 hover:text-slate-900 transition-colors">✕</button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2">Service Name</label><input value={viewData.name} readOnly className={`${styles.input} bg-slate-50 border-transparent text-slate-500`} /></div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2">Shop ID</label><input value={viewData.shopId} readOnly className={`${styles.input} bg-slate-50 border-transparent text-slate-500`} /></div>
                          </div>
                          <button onClick={() => setViewingId(null)} className="w-full py-2 bg-slate-100 text-slate-600 text-[10px] font-black rounded-xl">詳細表示を閉じる</button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-6">
                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-orange-50">{s.type === "DUMMY" ? "🧪" : "🛒"}</div>
                            <div>
                              <span className="font-black text-slate-800 text-lg block">{s.name}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">ID: {settings.shopId || "---"}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button onClick={() => startView(s)} className="px-4 py-2 text-[10px] font-black text-slate-400 hover:text-orange-500 transition-all border border-transparent hover:border-orange-50 rounded-xl">内容確認</button>
                            <button onClick={() => deleteService(s.id)} className="px-4 py-2 text-[10px] font-black text-red-200 hover:text-red-500 transition-all">削除</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {activeAdminTab === "users" && (
          <section>
            <h3 className={styles.sectionTitle}>👤 利用ユーザー一覧</h3>
            <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-slate-400">
                      <th className="p-6 text-[10px] font-black uppercase">ユーザー名</th>
                      <th className="p-6 text-[10px] font-black uppercase">メールアドレス</th>
                      <th className="p-6 text-[10px] font-black uppercase text-right">住所</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {allProfiles.map((u: any) => (
                      <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-6 font-black text-white">{u.name || "未設定"}</td>
                        <td className="p-6 font-bold text-slate-400">{u.email}</td>
                        <td className="p-6 text-right">
                          <span className="text-[10px] font-bold text-slate-500 block">
                            {u.zipCode ? `[${u.zipCode}] ` : ""}{u.address || "住所未登録"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeAdminTab === "history" && (
          <AdminHistory client={client} styles={styles} />
        )}
      </div>
    </div>
  );
};
