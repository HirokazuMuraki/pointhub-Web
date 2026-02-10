import React, { useState, useEffect } from "react";

export const UserSettings = ({ services, client, userEmail, styles }: any) => {
  const [selectedSvcId, setSelectedSvcId] = useState("");
  const [targetLoginId, setTargetLoginId] = useState("");
  const [targetPassword, setTargetPassword] = useState("");
  const [userCredentials, setUserCredentials] = useState<any[]>([]);
  const [fetchedPoints, setFetchedPoints] = useState<{ [key: string]: number | null }>({});
  const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});
  const [isEditing, setIsEditing] = useState<string | null>(null);

  // 1. 連携情報の取得（リアルタイム監視）
  useEffect(() => {
    const sub = client.models.UserServiceCredential.observeQuery({
      filter: { userEmail: { eq: userEmail } }
    }).subscribe({
      next: ({ items }: any) => {
        // ID順などでソートしておくと、画面のガタつきが減ります
        setUserCredentials([...items]);
      },
    });
    return () => sub.unsubscribe();
  }, [userEmail, client]);

  // 設定取得補助
  const getSvcSettings = (serviceId: string) => {
    const svcMaster = services.find((s: any) => s.id === serviceId);
    return svcMaster ? JSON.parse(svcMaster.connectionSettings || "{}") : {};
  };

  // 保存・更新処理
  const handleSaveCredential = async () => {
    // 判定の修正: 編集モードなら selectedSvcId が空でもOKにする（既存の値を保持するため）
    if (!targetLoginId || !targetPassword || (!isEditing && !selectedSvcId)) {
      alert("すべての項目を入力してください");
      return;
    }

    try {
      if (isEditing) {
        // 更新モード
        await client.models.UserServiceCredential.update({
          id: isEditing,
          loginId: targetLoginId,
          password: targetPassword
        });
        alert("情報を更新しました");
      } else {
        // 新規登録モード
        const svc = services.find((s: any) => s.id === selectedSvcId);
        await client.models.UserServiceCredential.create({
          userEmail,
          serviceId: selectedSvcId,
          serviceName: svc.name,
          loginId: targetLoginId,
          password: targetPassword
        });
        alert("連携情報を保存しました");
      }
      resetForm();
    } catch (err) {
      console.error(err);
      alert("処理に失敗しました");
    }
  };

  // 削除処理
  const handleDelete = async (id: string) => {
    if (!confirm("この連携を解除してもよろしいですか？\n（Shopserve側のポイントは消えません）")) return;
    try {
      await client.models.UserServiceCredential.delete({ id });
      // observeQueryが動かない場合に備え、手動でステートを更新
      setUserCredentials(prev => prev.filter(item => item.id !== id));
      alert("連携を解除しました");
    } catch (err) {
      alert("解除に失敗しました");
    }
  };

  // 編集モード切替
  const startEdit = (c: any) => {
    setIsEditing(c.id);
    setSelectedSvcId(c.serviceId);
    setTargetLoginId(c.loginId);
    setTargetPassword(c.password);
    // スクロールさせて編集フォームに誘導
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const resetForm = () => {
    setIsEditing(null);
    setSelectedSvcId("");
    setTargetLoginId("");
    setTargetPassword("");
  };

  const fetchPoint = async (credential: any) => {
    const settings = getSvcSettings(credential.serviceId);
    if (!settings.shopId) {
      alert("サービスの設定が見つかりません");
      return;
    }

    setIsLoading(prev => ({ ...prev, [credential.id]: true }));
    try {
      const { data } = await client.queries.getShopservePoints({
        accountId: credential.loginId,
        shopId: settings.shopId,
        authKey: settings.authKey
      });
      setFetchedPoints(prev => ({ ...prev, [credential.id]: data.points }));
    } catch (err) {
      console.error(err);
      alert("照会に失敗しました");
    } finally {
      setIsLoading(prev => ({ ...prev, [credential.id]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* 連携済みリスト */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h2 className={styles.sectionTitle}>🔗 連携済みサービス</h2>
        <div className="space-y-4">
          {userCredentials.length === 0 && (
            <div className="text-center py-10">
              <p className="text-slate-400 italic text-sm">連携中のサービスはありません</p>
            </div>
          )}
          {userCredentials.map((c) => (
            <div key={c.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-black text-slate-800 text-lg">{c.serviceName}</div>
                  <div className="text-xs font-medium text-slate-400">ID: {c.loginId}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(c)} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-all">✎</button>
                  <button onClick={() => handleDelete(c.id)} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:border-red-200 transition-all">🗑</button>
                </div>
              </div>
              
              <div className="flex justify-between items-end">
                <button 
                  onClick={() => fetchPoint(c)} 
                  disabled={isLoading[c.id]} 
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black shadow-sm active:scale-95 transition-all"
                >
                  {isLoading[c.id] ? "照会中..." : "残高確認"}
                </button>
                <div className="text-right">
                  <span className="text-2xl font-black text-orange-500">
                    {fetchedPoints[c.id] !== undefined ? fetchedPoints[c.id]?.toLocaleString() : "--"}
                  </span>
                  <span className="text-xs font-bold text-slate-400 ml-1">pt</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 登録・編集フォーム */}
      <div className={`p-8 rounded-[2.5rem] border transition-all duration-300 ${isEditing ? 'bg-blue-50 border-blue-100 ring-4 ring-blue-50' : 'bg-white border-slate-100'}`}>
        <h2 className={styles.sectionTitle}>{isEditing ? "✎ 連携情報の修正" : "➕ 新規サービス連携"}</h2>
        <div className="space-y-4">
          {!isEditing && (
            <div>
              <label className={styles.label}>対象サービス</label>
              <select value={selectedSvcId} onChange={(e) => setSelectedSvcId(e.target.value)} className={styles.input}>
                <option value="">選択してください</option>
                {services.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className={styles.label}>会員ID (Shopserve ID)</label>
            <input value={targetLoginId} onChange={(e) => setTargetLoginId(e.target.value)} className={styles.input} placeholder="会員IDを入力" />
          </div>
          <div>
            <label className={styles.label}>連携用パスワード</label>
            <input type="password" value={targetPassword} onChange={(e) => setTargetPassword(e.target.value)} className={styles.input} placeholder="パスワードを入力" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveCredential} className="flex-1 py-4 bg-slate-900 text-white font-black rounded-xl hover:bg-black transition-colors">
              {isEditing ? "変更を保存" : "連携情報を保存"}
            </button>
            {isEditing && (
              <button onClick={resetForm} className="px-6 py-4 bg-white text-slate-600 font-black rounded-xl border border-slate-200">
                キャンセル
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
