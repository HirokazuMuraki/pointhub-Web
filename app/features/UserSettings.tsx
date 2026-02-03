import React, { useState } from "react";

export const UserSettings = ({ services, client, userEmail, styles }: any) => {
  const [selectedSvcId, setSelectedSvcId] = useState("");
  const [targetLoginId, setTargetLoginId] = useState("");
  const [targetPassword, setTargetPassword] = useState("");

  const handleSaveCredential = async () => {
    const svc = services.find((s: any) => s.id === selectedSvcId);
    if (!svc || !targetLoginId || !targetPassword) {
      alert("すべての項目を入力してください");
      return;
    }

    try {
      await client.models.UserServiceCredential.create({
        userEmail,
        serviceId: selectedSvcId,
        serviceName: svc.name,
        loginId: targetLoginId,
        password: targetPassword
      });
      alert("連携情報を保存しました");
      setTargetPassword("");
      setTargetLoginId("");
      setSelectedSvcId("");
    } catch (err) {
      alert("保存に失敗しました");
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
      <h2 className={styles.sectionTitle}>🔑 交換先連携設定</h2>
      <div className="space-y-4">
        <div>
          <label className={styles.label}>対象サービス</label>
          <select value={selectedSvcId} onChange={(e) => setSelectedSvcId(e.target.value)} className={styles.input}>
            <option value="">サービスを選択</option>
            {services.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={styles.label}>ログインID</label>
          <input value={targetLoginId} onChange={(e) => setTargetLoginId(e.target.value)} className={styles.input} />
        </div>
        <div>
          <label className={styles.label}>パスワード</label>
          <input type="password" value={targetPassword} onChange={(e) => setTargetPassword(e.target.value)} className={styles.input} />
        </div>
        <button onClick={handleSaveCredential} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl mt-4">
          連携情報を保存
        </button>
      </div>
    </div>
  );
};
