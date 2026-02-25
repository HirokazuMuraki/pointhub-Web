"use client";

import { useState, useEffect } from "react";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react";
import { fetchAuthSession } from "aws-amplify/auth"; 
import "@aws-amplify/ui-react/styles.css";
import type { Schema } from "@/amplify/data/resource";
import outputs from "@/amplify_outputs.json";

import { PointExchange } from "./features/PointExchange";
import { UserSettings } from "./features/UserSettings";
import { AdminPanel } from "./features/Admin";
import { HistoryList } from "./features/History";
import { UserProfile } from "./features/UserProfile";

Amplify.configure(outputs);
const client = generateClient<Schema>();

function Dashboard({ user, signOut }: { user: any, signOut: any }) {
  const [services, setServices] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("exchange");
  const [isAdmin, setIsAdmin] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const userEmail = user?.signInDetails?.loginId || user?.username || "";

  useEffect(() => {
    fetchAuthSession().then(session => {
      const groups = session.tokens?.idToken?.payload["cognito:groups"] as string[];
      if (groups?.includes("Admins")) setIsAdmin(true);
    });
    client.models.ServiceMaster.list().then(({ data }) => setServices(data));
    
    setDisplayName(userEmail.split('@')[0]);
    client.models.UserProfile.list({ filter: { email: { eq: userEmail } } }).then(({ data }) => {
      if (data.length > 0 && data[0].name) setDisplayName(data[0].name);
    });
  }, [userEmail]);

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

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row w-full">
      <header className="lg:hidden flex items-center justify-between bg-white px-6 py-4 border-b border-slate-100 sticky top-0 z-30">
        <h1 className="text-xl font-black italic text-slate-900">POINT<span className="text-orange-500">HUB</span></h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-900 text-2xl font-bold">
          {isSidebarOpen ? "✕" : "☰"}
        </button>
      </header>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-100 flex flex-col transform transition-transform duration-300 lg:translate-x-0 lg:static lg:h-screen ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-8 pb-2 hidden lg:block">
          <h1 className="text-3xl font-black italic text-slate-900 leading-none">POINT<span className="text-orange-500">HUB</span></h1>
        </div>
        <div className="px-6 py-2 mt-4 lg:mt-0">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">ようこそ</p>
            <p className="text-sm font-black text-slate-900 truncate mt-0.5">{displayName} 様</p>
            {isAdmin && <span className="text-[8px] font-black text-orange-600 bg-orange-100/50 px-1.5 py-0.5 rounded uppercase mt-1 inline-block">Admin Access</span>}
          </div>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} 
              className={`w-full flex items-center space-x-3 px-4 py-4 rounded-2xl font-black transition-all ${activeTab === item.id ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"}`}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-slate-50">
          <button onClick={signOut} className="flex items-center space-x-3 px-4 py-3 w-full text-left text-xs font-black text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
            <span className="text-lg">🚪</span><span>ログアウト</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 lg:p-12 w-full min-h-screen">
        <div className="max-w-7xl mx-auto w-full">
          <header className="mb-6 lg:mb-10">
            <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight lowercase italic">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h2>
            <div className="h-1.5 w-16 bg-orange-500 mt-4 rounded-full"></div>
          </header>
          <div className="bg-white p-4 lg:p-10 rounded-[2rem] lg:rounded-[3rem] shadow-xl border border-slate-100 min-h-[500px] w-full">
            {activeTab === "exchange" && <PointExchange client={client} userEmail={userEmail} styles={styles} services={services} setActiveTab={setActiveTab} />}
            {activeTab === "history" && <HistoryList client={client} userEmail={userEmail} styles={styles} />}
            {activeTab === "settings" && <UserSettings services={services} client={client} userEmail={userEmail} styles={styles} />}
            {activeTab === "profile" && <UserProfile client={client} userEmail={userEmail} styles={styles} />}
            {activeTab === "admin" && isAdmin && <AdminPanel client={client} styles={styles} services={services} onRefresh={() => {}} />}
          </div>
        </div>
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
      {/* 構文エラーを回避するための標準styleタグ形式 */}
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
            <div className="w-full"><Authenticator /></div>
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
