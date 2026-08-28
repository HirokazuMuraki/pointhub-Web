"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAlert } from "./AlertProvider";

export const PointExchange = ({ client, userEmail, styles, services, setActiveTab, generateTrackingNumber }: any) => {
  const { showAlert, showConfirm } = useAlert();
  
  const [credentials, setCredentials] = useState<any[]>([]);
  const [fromCredId, setFromCredId] = useState("");
  const [toCredId, setToCredId] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [isOpenFrom, setIsOpenFrom] = useState(false);
  const [isOpenTo, setIsOpenTo] = useState(false);

  // ポイント交換完了ポップアップ用の独自ステート
  const [showSuccessModal, setShowSuccessModal] = useState<any>(null);

  const getSvcInfo = useCallback((serviceId: string) => {
    const svcMaster = services.find((s: any) => s.id === serviceId);
    if (!svcMaster) return null;
    const settings = JSON.parse(svcMaster.connectionSettings || "{}");
    return { shopId: settings?.shopId, masterAuthKey: settings?.authKey };
  }, [services]);

  const isAppMembersService = (svcName: string) => {
    return svcName?.includes("アプリメンバーズ") === true;
  };

  const isMakeShopService = (svcName: string) => {
    return svcName?.includes("MakeShop") === true || svcName?.includes("メイクセレクト") === true || svcName?.toLowerCase().includes("makeshop") === true;
  };

  // 外部APIから最新ポイントを取得してDBに同期する処理
  const syncToDB = useCallback(async (cred: any) => {
    if (!cred || cred.serviceName.includes("ダミー")) return;
    try {
      let latestBalance: number | null = null;

      if (isAppMembersService(cred.serviceName)) {
        // ■ アプリメンバーズの同期処理
        const { data } = await client.queries.getAppMembersPoints({
          mailaddress: cred.loginId
        });
        if (data) {
          const res = typeof data === 'string' ? JSON.parse(data) : data;
          latestBalance = typeof res.point === 'number' ? res.point : (typeof res.points === 'number' ? res.points : null);
        }
      } else if (isMakeShopService(cred.serviceName)) {
        // ■ MakeShopの同期処理
        const { data } = await client.queries.getMakeshopPoints({
          mailaddress: cred.loginId
        });
        if (data) {
          const res = typeof data === 'string' ? JSON.parse(data) : data;
          latestBalance = typeof res.point === 'number' ? res.point : (typeof res.points === 'number' ? res.points : null);
        }
      } else {
        // ■ ショップサーブの同期処理
        const info = getSvcInfo(cred.serviceId);
        if (!info?.shopId) return;
        const { data } = await client.queries.getShopservePoints({
          accountId: cred.loginId,
          shopId: info.shopId,
          authKey: info.masterAuthKey || cred.password,
        });
        if (data) {
          const res = typeof data === 'string' ? JSON.parse(data) : data;
          latestBalance = typeof res.point === 'number' ? res.point : (typeof res.points === 'number' ? res.points : null);
        }
      }

      // 値が取得できており、かつ現在のDB値と変更がある場合のみDB更新（無駄なループ・チラつき防止）
      if (latestBalance !== null && latestBalance !== cred.dummyBalance) {
        await client.models.UserServiceCredential.update({
          id: cred.id,
          dummyBalance: latestBalance
        });
      }
    } catch (e) {
      console.error(`${cred.serviceName} の同期失敗:`, e);
    }
  }, [client, getSvcInfo]);

  useEffect(() => {
    const sub = client.models.UserServiceCredential.observeQuery({ 
      filter: { userEmail: { eq: userEmail } } 
    }).subscribe({
      next: ({ items }: any) => {
        setCredentials([...items]);
        items.forEach((item: any) => {
          if (!item.serviceName.includes("ダミー")) syncToDB(item);
        });
      },
    });
    return () => sub.unsubscribe();
  }, [userEmail, client, syncToDB]);

  const handleExchange = async () => {
    const fromCred = credentials.find(c => c.id === fromCredId);
    const toCred = credentials.find(c => c.id === toCredId);
    const val = parseInt(amount);

    if (!val || val < 1 || !fromCred || !toCred) {
      return await showAlert("サービスを選択し、交換ポイント数を1以上で入力してください");
    }
    
    if ((fromCred.dummyBalance || 0) < val) {
      return await showAlert(`残高不足です（現在: ${fromCred.dummyBalance || 0}pt）`);
    }

    const ok = await showConfirm("交換を実行しますか？");
    if (!ok) return;

    setIsProcessing(true);
    let step = 0; // ロールバック判定用ステップカウンター (1: FROM引き落とし完了)

    try {
      const trackingNumber = generateTrackingNumber ? generateTrackingNumber() : `TX-${Date.now()}`;
      const fromBalanceAfter = (fromCred.dummyBalance || 0) - val;
      const toBalanceAfter = (toCred.dummyBalance || 0) + val;

      const isFromDummy = fromCred.serviceName.includes("ダミー");
      const isFromAppMembers = isAppMembersService(fromCred.serviceName);
      const isFromMakeShop = isMakeShopService(fromCred.serviceName);

      const isToDummy = toCred.serviceName.includes("ダミー");
      const isToAppMembers = isAppMembersService(toCred.serviceName);
      const isToMakeShop = isMakeShopService(toCred.serviceName);

      // --- ステップ1: 交換元 (FROM) からポイントを引き落とす ---
      if (!isFromDummy) {
        if (isFromAppMembers) {
          // ■ アプリメンバーズから減算 (type: 2 / 減算)
          const { data: opResult, errors } = await client.mutations.operateAppMembersPoints({
            mailaddress: fromCred.loginId,
            amount: val,
            type: 2, // 2: 減算
            description: `PH-Exchange-Out:${trackingNumber}`
          });
          if (errors) throw new Error(errors[0].message);
          const res = typeof opResult === 'string' ? JSON.parse(opResult) : opResult;
          if (!res?.success) throw new Error(res?.message || "アプリメンバーズでの減算に失敗しました。");
        } else if (isFromMakeShop) {
          // ■ MakeShopから減算 (type: 2 / 減算)
          const { data: opResult, errors } = await client.mutations.operateMakeshopPoints({
            mailaddress: fromCred.loginId,
            amount: val,
            type: 2, // 2: 減算
            description: `PH-Exchange-Out:${trackingNumber}`
          });
          if (errors) throw new Error(errors[0].message);
          const res = typeof opResult === 'string' ? JSON.parse(opResult) : opResult;
          if (!res?.success) throw new Error(res?.message || "MakeShopでの減算に失敗しました。");
        } else {
          // ■ ショップサーブから減算
          const info = getSvcInfo(fromCred.serviceId);
          const { data: opResult } = await client.mutations.operateShopservePoints({
            accountId: fromCred.loginId,
            shopId: info?.shopId,
            authKey: info?.masterAuthKey || fromCred.password,
            amount: -val,
            note: `PH-Exchange-Out:${trackingNumber}`
          });
          if (!opResult?.success) throw new Error(opResult?.message || "ショップサーブポイントの減算に失敗しました。");
        }
      }

      // 交換元データベースの残高更新
      await client.models.UserServiceCredential.update({
        id: fromCred.id,
        dummyBalance: fromBalanceAfter
      });

      step = 1; // FROM側の処理成功

      // --- ステップ2: 交換先 (TO) へポイントを加算する ---
      if (!isToDummy) {
        if (isToAppMembers) {
          // ■ アプリメンバーズへ加算 (type: 1 / 加算)
          const { data: opResult, errors } = await client.mutations.operateAppMembersPoints({
            mailaddress: toCred.loginId,
            amount: val,
            type: 1, // 1: 加算
            description: `PH-Exchange-In:${trackingNumber}`
          });
          if (errors) throw new Error(errors[0].message);
          const res = typeof opResult === 'string' ? JSON.parse(opResult) : opResult;
          if (!res?.success) throw new Error(res?.message || "アプリメンバーズでの加算に失敗しました。");
        } else if (isToMakeShop) {
          // ■ MakeShopへ加算 (type: 1 / 加算)
          const { data: opResult, errors } = await client.mutations.operateMakeshopPoints({
            mailaddress: toCred.loginId,
            amount: val,
            type: 1, // 1: 加算
            description: `PH-Exchange-In:${trackingNumber}`
          });
          if (errors) throw new Error(errors[0].message);
          const res = typeof opResult === 'string' ? JSON.parse(opResult) : opResult;
          if (!res?.success) throw new Error(res?.message || "MakeShopでの加算に失敗しました。");
        } else {
          // ■ ショップサーブへ加算
          const info = getSvcInfo(toCred.serviceId);
          const { data: opResult } = await client.mutations.operateShopservePoints({
            accountId: toCred.loginId,
            shopId: info?.shopId,
            authKey: info?.masterAuthKey || toCred.password,
            amount: val,
            note: `PH-Exchange-In:${trackingNumber}`
          });
          if (!opResult?.success) throw new Error(opResult?.message || "ショップサーブポイントの加算に失敗しました。");
        }
      }

      // 交換先データベースの残高更新
      await client.models.UserServiceCredential.update({
        id: toCred.id,
        dummyBalance: toBalanceAfter
      });

      // 取引履歴作成
      await client.models.ExchangeTransaction.create({
        userEmail, 
        fromServiceName: fromCred.serviceName, 
        toServiceName: toCred.serviceName, 
        amount: val, 
        dummyBalance: fromBalanceAfter,
        status: "COMPLETED",
        trackingNumber
      });

      setShowSuccessModal({ trackingNumber });
      setAmount("");
    } catch (e: any) {
      // ロールバック（補償トランザクション）: FROM引き落としが完了しているのにTO加算でコケた場合
      if (step === 1) {
        try {
          const isFromDummy = fromCred.serviceName.includes("ダミー");
          const isFromAppMembers = isAppMembersService(fromCred.serviceName);
          const isFromMakeShop = isMakeShopService(fromCred.serviceName);

          if (!isFromDummy) {
            if (isFromAppMembers) {
              // アプリメンバーズへ元のポイントを払い戻し (type: 1 / 加算)
              await client.mutations.operateAppMembersPoints({
                mailaddress: fromCred.loginId,
                amount: val,
                type: 1, 
                description: `Rollback-Exchange-Error`
              });
            } else if (isFromMakeShop) {
              // MakeShopへ元のポイントを払い戻し (type: 1 / 加算)
              await client.mutations.operateMakeshopPoints({
                mailaddress: fromCred.loginId,
                amount: val,
                type: 1,
                description: `Rollback-Exchange-Error`
              });
            } else {
              // ショップサーブへ元のポイントを払い戻し
              const info = getSvcInfo(fromCred.serviceId);
              await client.mutations.operateShopservePoints({
                accountId: fromCred.loginId,
                shopId: info?.shopId,
                authKey: info?.masterAuthKey || fromCred.password,
                amount: val,
                note: `Rollback-Exchange-Error`
              });
            }
          }

          // FROMのデータベース残高表示を元の状態に戻す
          await client.models.UserServiceCredential.update({
            id: fromCred.id,
            dummyBalance: fromCred.dummyBalance || 0
          });

        } catch (rollbackErr) {
          console.error("ポイント払い戻し（ロールバック）処理自体に失敗しました:", rollbackErr);
        }
      }

      await showAlert("エラー: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const CustomSelect = ({ value, onChange, placeholder, options, isOpen, setIsOpen, disabledId }: any) => {
    const selected = options.find((o: any) => o.id === value);
    return (
      <div className="relative">
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className={`${styles.input} flex flex-col justify-center min-h-[60px] cursor-pointer bg-white relative pr-10`}
        >
          {selected ? (
            <>
              <div className="text-[11px] font-black text-slate-800">{selected.serviceName}</div>
              <div className="text-[10px] font-bold text-orange-500">{(selected.dummyBalance ?? 0).toLocaleString()} pts</div>
            </>
          ) : (
            <span className="text-slate-400 text-xs">{placeholder}</span>
          )}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">▼</div>
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
            {options.map((c: any) => (
              <div 
                key={c.id}
                onClick={() => {
                  if (c.id !== disabledId) {
                    onChange(c.id);
                    setIsOpen(false);
                  }
                }}
                className={`p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${c.id === disabledId ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="text-[11px] font-black text-slate-700">{c.serviceName}</div>
                <div className="text-[10px] font-bold text-slate-400">{(c.dummyBalance ?? 0).toLocaleString()} pts</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <h3 className={`${styles.sectionTitle} mb-4`}>🔄 ポイント交換実行</h3>
      <div className="bg-slate-50 p-6 lg:p-8 rounded-[2.5rem] border-2 border-slate-100 space-y-4 shadow-inner">
        <div>
          <label className={styles.label}>交換元 (FROM)</label>
          <CustomSelect 
            value={fromCredId}
            onChange={setFromCredId}
            placeholder="サービスを選択"
            options={credentials}
            isOpen={isOpenFrom}
            setIsOpen={(val: boolean) => { setIsOpenFrom(val); setIsOpenTo(false); }}
          />
        </div>

        <div>
          <label className={styles.label}>交換先 (TO)</label>
          <CustomSelect 
            value={toCredId}
            onChange={setToCredId}
            placeholder="サービスを選択"
            options={credentials}
            isOpen={isOpenTo}
            setIsOpen={(val: boolean) => { setIsOpenTo(val); setIsOpenFrom(false); }}
            disabledId={fromCredId}
          />
        </div>

        <div className="pt-2 border-t">
          <label className={styles.label}>交換数</label>
          <input 
            type="number" 
            min="1" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            className={styles.input} 
            placeholder="1以上の数値を入力"
          />
        </div>

        <button 
          onClick={handleExchange} 
          disabled={isProcessing} 
          className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl transition-all hover:bg-orange-500 disabled:bg-slate-200 shadow-lg active:scale-95"
        >
          {isProcessing ? "実行中..." : "交換を実行する"}
        </button>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 relative text-center space-y-5">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl">✓</div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 leading-tight">交換完了！</h3>
              <p className="text-sm text-slate-500 font-bold">
                お問い合わせ番号: <span className="font-black text-slate-800 tracking-wider">{showSuccessModal.trackingNumber}</span>
              </p>
            </div>
            <button 
              onClick={() => {
                setShowSuccessModal(null);
                if (setActiveTab) setActiveTab("history");
              }}
              className="w-full py-4 rounded-2xl text-sm font-black transition-all bg-slate-900 text-white hover:bg-orange-500 shadow-lg active:scale-95"
            >
              確認
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
