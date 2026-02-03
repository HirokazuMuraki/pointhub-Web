"use client";
import { useState, useEffect } from "react";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { type Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";

import { Sidebar, Footer, MobileNav } from "./components/Layout";
import { PolicyModal, UserHistoryModal } from "./components/Modals";
import { ExchangeForm } from "./features/Exchange";
import { AdminPanel } from "./features/Admin";
import { HistoryList } from "./features/History";
import { ProfileSettings } from "./features/Profile";
import { UserSettings } from "./features/UserSettings";

Amplify.configure(outputs);
const client = generateClient<Schema>();

const styles = {
  input: "w-full p-3 border rounded-xl bg-white text-gray-900 focus:ring-4 focus:ring-blue-500/20 mb-2 border-gray-200 text-lg font-medium transition-all",
  label: "text-sm font-black text-gray-500 uppercase tracking-widest ml-2 mb-1 block",
  sectionTitle: "text-2xl font-black text-slate-900 mb-6 flex items-center gap-2",
};

function LoggedInApp({ user, signOut }: { user: any, signOut: any }) {
  const [activeTab, setActiveTab] = useState("home");
  const [services, setServices] = useState<Schema["ServiceMaster"]["type"][]>([]);
  const [transactions, setTransactions] = useState<Schema["ExchangeTransaction"]["type"][]>([]);
  const [profile, setProfile] = useState<Schema["UserProfile"]["type"] | null>(null);
  const [allUsers, setAllUsers] = useState<Schema["UserProfile"]["type"][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [viewingUser, setViewingUser] = useState<{email: string, name: string} | null>(null);
  const [policyContent, setPolicyContent] = useState<{title: string, content: string} | null>(null);

  const userEmail = user?.signInDetails?.loginId || user?.username || "";
  const isAdmin = profile?.role === "ADMIN";

  useEffect(() => {
    if (!user || !client.models) return;
    const subs: any[] = [];
    
    subs.push(client.models.ServiceMaster.observeQuery().subscribe({ next: ({ items }) => setServices([...items]) }));

    subs.push(client.models.UserProfile.observeQuery({ filter: { email: { eq: userEmail } } }).subscribe({
      next: ({ items }) => {
        if (items.length > 0) {
          const p = items[0];
          setProfile(p);
          
          const transactionSub = client.models.ExchangeTransaction.observeQuery({
             filter: p.role === "ADMIN" ? undefined : { userEmail: { eq: userEmail } }
          }).subscribe({
            next: ({ items }) => {
              const sorted = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              setTransactions(sorted);
            }
          });
          subs.push(transactionSub);
          setIsLoading(false);
        } else {
          client.models.UserProfile.create({ 
            email: userEmail, 
            role: userEmail.includes("admin") ? "ADMIN" : "USER", 
            isDisabled: false 
          }).then(() => setIsLoading(false));
        }
      }
    }));

    subs.push(client.models.UserProfile.observeQuery().subscribe({ next: ({ items }) => setAllUsers([...items]) }));
    
    return () => subs.forEach(s => s?.unsubscribe());
  }, [user, userEmail]);

  if (isLoading) return <div className="h-screen flex items-center justify-center font-bold">読み込み中...</div>;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} name={profile?.name} email={userEmail} signOut={signOut} isAdmin={isAdmin} />
      <main className="flex-grow p-4 md:p-10 max-w-5xl mx-auto w-full pb-48">
        <header className="md:hidden flex justify-between items-center mb-8 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <h1 className="text-xl font-black text-blue-600 italic">POINT HUB</h1>
          <p className="text-xs font-black text-slate-900">{profile?.name || userEmail}</p>
        </header>

        {activeTab === "home" && <ExchangeForm services={services} client={client} userEmail={userEmail} onSuccess={() => setActiveTab("history")} styles={styles} />}
        {activeTab === "history" && <HistoryList transactions={transactions} allUsers={allUsers} isAdmin={isAdmin} styles={styles} />}
        {activeTab === "userSettings" && <UserSettings services={services} client={client} userEmail={userEmail} styles={styles} />}
        {activeTab === "profile" && <ProfileSettings profile={profile} client={client} styles={styles} />}
        {activeTab === "admin" && isAdmin && <AdminPanel services={services} allUsers={allUsers} transactions={transactions} client={client} styles={styles} setViewingUser={setViewingUser} />}
        <Footer setPolicyContent={setPolicyContent} />
      </main>
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin} />
      <PolicyModal content={policyContent} onClose={() => setPolicyContent(null)} />
      <UserHistoryModal viewingUser={viewingUser} transactions={transactions} onClose={() => setViewingUser(null)} />
    </div>
  );
}

export default function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => <LoggedInApp user={user} signOut={signOut} />}
    </Authenticator>
  );
}
