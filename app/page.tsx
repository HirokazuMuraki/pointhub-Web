"use client";

import { useState, useEffect, useCallback } from "react";
import { Amplify } from "aws-amplify";
import { I18n } from "aws-amplify/utils";
import { sessionStorage } from "aws-amplify/utils";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";
import { generateClient } from "aws-amplify/data";
import { Authenticator, useAuthenticator, translations } from "@aws-amplify/ui-react";
import { fetchAuthSession } from "aws-amplify/auth"; 
import "@aws-amplify/ui-react/styles.css";
import type { Schema } from "@/amplify/data/resource";
import outputs from "@/amplify_outputs.json";

import { ExchangeWrapper } from "./features/ExchangeWrapper";
import { UserSettings } from "./features/UserSettings";
import { AdminPanel } from "./features/Admin";
import { HistoryList } from "./features/History";
import { UserProfile } from "./features/UserProfile";
import { Footer } from "@/app/components/Layout";
import { POLICIES } from "@/app/constants";

Amplify.configure(outputs);
cognitoUserPoolsTokenProvider.setKeyValueStorage(sessionStorage);
const client = generateClient<Schema>();

// 日本語化の設定
I18n.putVocabularies(translations);
I18n.setLanguage("ja");
I18n.putVocabularies({
  ja: {
    "Sign In": "ログイン",
    "Sign Up": "新規登録",
    "Email": "メールアドレス",
    "Password": "パスワード",
    "Confirm Password": "パスワード（確認）",
    "Forgot your password?": "パスワードをお忘れですか？",
    "Create Account": "アカウントを作成",
    "Enter your Email": "メールアドレスを入力",
    "Enter your Password": "パスワードを入力",
  },
});

function Dashboard({ user, signOut }: { user: any, signOut: any }) {
  const [services, setServices] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("exchange");
  const [isAdmin, setIsAdmin] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [policyContent, setPolicyContent] = useState<{title: string, content: string} | null>(null);
  const userEmail = user?.signInDetails?.loginId || user?.username || "";

  const refreshServices = useCallback(async () => {
    try {
      const { data } = await client.models.ServiceMaster.list();
      setServices(data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    fetchAuthSession().then(session => {
      const groups = session.tokens?.idToken?.payload["cognito:groups"] as string[];
      if (groups?.includes("Admins")) setIsAdmin(true);
    });
    refreshServices();

    // プロフィール取得および初期登録ロジック
    const syncProfile = async () => {
      if (!userEmail) return;
      
      try {
        const { data } = await client.models.UserProfile.list({ 
          filter: { email: { eq: userEmail } } 
        });

        if (data.length > 0) {
          // すでにデータがある場合
          setDisplayName(data[0].name || userEmail.split('@')[0]);
        } else {
          // データがない場合（初回ログイン時）
          const defaultName = userEmail.split('@')[0];
          await client.models.UserProfile.create({
            email: userEmail,
            name: defaultName,
          });
          setDisplayName(defaultName);
        }
      } catch (err) {
        console.error("Profile sync error:", err);
        setDisplayName(userEmail.split('@')[0]);
      }
    };

    syncProfile();
  }, [userEmail, refreshServices]);

  const menuItems = [
    { id: "exchange", label: "交換実行", icon: "🔄" },
    { id: "history", label: "履歴一覧", icon: "📋" },
    { id: "settings", label: "交換先設定", icon: "🔗" },
    { id: "profile", label: "プロフィール", icon: "👤" },
    ...(isAdmin ? [{ id: "admin", label: "管理設定", icon: "⚙️" }] : [])
  ];

  const styles = {
    label: "block text-xs font-black text-slate-500 mb-2 ml-1 uppercase",
    input: "w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none font-bold text-slate-700",
    sectionTitle: "text-2xl font-black text-slate-800 mb-6",
  };

  const handlePolicyClick = (title: string) => {
    if (title === "プライバシーポリシー") setPolicyContent(POLICIES.privacy);
    if (title === "セキュリティポリシー") setPolicyContent(POLICIES.security);
    if (title === "特定商取引法に基づく表記") setPolicyContent(POLICIES.tokusho);
  };

  return (
    <div className="h-screen bg-[#F8FAFC] flex flex-col lg:flex-row overflow-hidden w-full">
      <header className="lg:hidden flex items-center justify-between bg-white px-6 py-4 border-b border-slate-100 sticky top-0 z-30 shrink-0">
        <h1 className="text-xl font-black italic text-slate-900">POINT<span className="text-orange-500">HUB</span></h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-900 text-2xl font-bold">{isSidebarOpen ? "✕" : "☰"}</button>
      </header>

      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-100 flex flex-col transform transition-transform duration-300 lg:translate-x-0 lg:static lg:h-screen shrink-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="shrink-0">
          <div className="p-8 pb-2 hidden lg:block">
            <h1 className="text-3xl font-black italic text-slate-900 leading-none">POINT<span className="text-orange-500">HUB</span></h1>
          </div>
          
          <div className="px-6 py-4 mt-4 lg:mt-0">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative">
              <div className="flex justify-between items-start">
                <div className="flex-1 overflow-hidden">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">ようこそ</p>
                  <p className="text-sm font-black text-slate-900 truncate mt-0.5">{displayName} 様</p>
                </div>
                <button onClick={signOut} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100 flex items-center gap-1 shrink-0 ml-2" title="ログアウト">
                  <span className="text-sm">🚪</span>
                  <span className="text-[10px] font-black whitespace-nowrap">ログアウト</span>
                </button>
              </div>
              {isAdmin && <span className="text-[8px] font-black text-orange-600 bg-orange-100/50 px-1.5 py-0.5 rounded uppercase mt-1 inline-block">Admin Access</span>}
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto scrollbar-hide">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} 
              className={`w-full flex items-center space-x-3 px-4 py-4 rounded-2xl font-black transition-all ${activeTab === item.id ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"}`}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto p-6 lg:p-12 text-slate-900 scroll-smooth">
        <div className="max-w-7xl mx-auto w-full min-h-full flex flex-col">
          <div className="flex-grow">
            <header className="mb-6 lg:mb-10">
              <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight lowercase italic">{menuItems.find(i => i.id === activeTab)?.label}</h2>
              <div className="h-1.5 w-16 bg-orange-500 mt-4 rounded-full"></div>
            </header>
            
            <div className="bg-white p-4 lg:p-10 rounded-[2rem] lg:rounded-[3rem] shadow-xl border border-slate-100 min-h-[500px] w-full mb-10">
              {activeTab === "exchange" && <ExchangeWrapper client={client} userEmail={userEmail} styles={styles} services={services} setActiveTab={setActiveTab} />}
              {activeTab === "history" && <HistoryList client={client} userEmail={userEmail} styles={styles} />}
              {activeTab === "settings" && <UserSettings services={services} client={client} userEmail={userEmail} styles={styles} />}
              {activeTab === "profile" && <UserProfile client={client} userEmail={userEmail} styles={styles} />}
              {activeTab === "admin" && isAdmin && <AdminPanel client={client} styles={styles} services={services} onRefresh={refreshServices} />}
            </div>
          </div>
          <Footer setPolicyContent={(data: any) => handlePolicyClick(data.title)} />
        </div>

        {policyContent && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6" onClick={() => setPolicyContent(null)}>
            <div className="bg-white rounded-[2rem] p-8 max-w-2xl w-full shadow-2xl relative text-slate-900" onClick={e => e.stopPropagation()}>
              <button onClick={() => setPolicyContent(null)} className="absolute top-6 right-6 text-2xl hover:text-red-500 transition-colors">✕</button>
              <h3 className="text-2xl font-black mb-4">{policyContent.title}</h3>
              <div className="text-slate-600 font-bold leading-relaxed overflow-y-auto max-h-[60vh] pr-4 whitespace-pre-wrap">{policyContent.content}</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function LandingPageSwitcher() {
  const { authStatus, user, signOut } = useAuthenticator((context) => [context.authStatus]);
  
  if (authStatus === 'configuring') return <div className="min-h-screen flex items-center justify-center font-black italic text-slate-200 text-4xl">LOADING...</div>;
  if (authStatus === 'authenticated') return <Dashboard user={user} signOut={signOut} />;

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        [data-amplify-authenticator] { display: block !important; width: 100% !important; border: none !important; background: transparent !important; box-shadow: none !important; }
        .amplify-authenticator__column { width: 100% !important; max-width: 100% !important; }
        .amplify-flex { width: 100% !important; }
        .amplify-input { border-radius: 1rem !important; padding: 0.75rem 1rem !important; }
        .amplify-button--primary { border-radius: 1rem !important; background: #0f172a !important; font-weight: 900 !important; }
        .amplify-tabs__item--active { border-color: #f97316 !important; color: #0f172a !important; }
      `}} />

      <nav className="flex justify-between items-center px-6 lg:px-8 py-6 lg:py-10 max-w-7xl mx-auto relative z-20">
        <h1 className="text-2xl lg:text-4xl font-black italic tracking-tighter">POINT<span className="text-orange-500">HUB</span></h1>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          <a href="https://www.waqup.co.jp/" target="_blank">Official Site</a>
        </div>
      </nav>

      <section className="relative px-6 lg:px-8 pt-6 pb-20 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 min-h-[80vh]">
        <div className="w-full lg:w-1/2 text-center lg:text-left relative z-10">
          <div className="inline-block px-4 py-1.5 bg-slate-900 text-white text-[9px] font-black rounded-full mb-6 lg:mb-10 uppercase tracking-[0.3em]">Next Gen Fintech</div>
          <h2 className="text-4xl lg:text-[6rem] font-black leading-[1.1] lg:leading-[0.9] mb-8 tracking-tighter text-slate-900">
            ポイントを、<br/><span className="text-orange-500 italic">自由</span>にする。
          </h2>
          <p className="text-lg lg:text-xl text-slate-400 font-bold leading-relaxed mb-10 max-w-md mx-auto lg:mx-0">
            複数のポイントを一つに。資産価値を最大化する次世代ポイントエクスチェンジ。
          </p>
        </div>

        <div className="w-full lg:w-[540px] relative z-20">
          <div className="absolute inset-0 bg-orange-500/10 blur-[80px] rounded-full -z-10" />
          <div className="bg-white p-6 lg:p-14 rounded-[3rem] lg:rounded-[4rem] shadow-2xl border border-slate-50 flex flex-col items-center">
            <div className="mb-8 text-center w-full">
              <h3 className="text-xl lg:text-2xl font-black tracking-tighter text-slate-900 uppercase italic">Member Login</h3>
              <div className="h-1 bg-orange-500 w-10 mx-auto mt-2 rounded-full"></div>
            </div>
            <div className="w-full"><Authenticator initialState="signIn" /></div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  return (
    <Authenticator.Provider>
      <LandingPageSwitcher />
    </Authenticator.Provider>
  );
}
