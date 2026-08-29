import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Plus, MessageSquare, RefreshCw, Mail as MailIcon, Search, Clock, CheckCircle, AlertCircle, LayoutDashboard, Send, TrendingUp } from "lucide-react";
import { api } from "../services/api";
import ComposeModal from "../components/ComposeModal";
import EmailTable from "../components/EmailTable";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "scheduled" | "sent">("dashboard");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: userAuth } = useQuery({
    queryKey: ["authMe"],
    queryFn: () => api.get("/auth/me").then((res) => res.data),
    retry: false,
  });

  const { data: slackStatus, refetch: refetchSlack } = useQuery({
    queryKey: ["slackStatus"],
    queryFn: () => api.get("/slack/status").then((res) => res.data),
  });

  const { data: searchResults, isLoading: isSearchLoading } = useQuery({
    queryKey: ["search", searchQuery],
    queryFn: () => api.get(`/search/emails?q=${searchQuery}`).then((res) => res.data.emails),
    enabled: searchQuery.length > 2,
  });

  const { data: scheduledEmails, isLoading: isScheduledLoading, refetch: refetchScheduled } = useQuery({
    queryKey: ["scheduledEmails"],
    queryFn: () => api.get("/emails/scheduled").then((res) => res.data.emails),
  });

  const { data: sentEmails, isLoading: isSentLoading, refetch: refetchSent } = useQuery({
    queryKey: ["sentEmails"],
    queryFn: () => api.get("/emails/sent").then((res) => res.data.emails),
  });

  const handleLogout = async () => {
    await api.post("/auth/logout");
    window.location.href = "/login";
  };

  const handleSlackConnect = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || "http://localhost:4000/api"}/slack/connect`;
  };

  const handleSlackDisconnect = async () => {
    await api.post("/slack/disconnect");
    refetchSlack();
  };

  if (!userAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  const totalScheduled = scheduledEmails?.length || 0;
  const totalSent = sentEmails?.filter((e: any) => e.status === "sent").length || 0;
  const totalFailed = sentEmails?.filter((e: any) => e.status === "failed").length || 0;

  const NavItem = ({ id, label, icon: Icon }: { id: any, label: string, icon: any }) => (
    <button
      onClick={() => { setActiveTab(id); setSearchQuery(""); }}
      className={`flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
        activeTab === id && !searchQuery ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <Icon size={14} className={activeTab === id && !searchQuery ? "text-gray-900" : "text-gray-400"} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F7F7F8] flex flex-col font-sans">
      
      {/* Top Navigation - Ultra Minimal */}
      <nav className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div className="flex items-center cursor-pointer" onClick={() => setActiveTab("dashboard")}>
            <div className="w-7 h-7 bg-gray-900 rounded-md flex items-center justify-center mr-2.5 shadow-sm">
              <MailIcon className="text-white w-3.5 h-3.5" strokeWidth={2.5} />
            </div>
            <span className="text-[15px] font-bold text-gray-900 tracking-tight">ReachInbox</span>
          </div>

          {/* Links */}
          <div className="hidden md:flex items-center gap-1">
            <NavItem id="dashboard" label="Overview" icon={LayoutDashboard} />
            <NavItem id="scheduled" label="Queue" icon={Clock} />
            <NavItem id="sent" label="History" icon={Send} />
          </div>
        </div>

        {/* Right Nav actions */}
        <div className="flex items-center gap-5">
          {/* Slack Integration Minimal */}
          <div className="hidden lg:block border-r border-gray-200 pr-5">
            {slackStatus?.connected ? (
              <button onClick={handleSlackDisconnect} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-rose-50 hover:text-rose-700 transition-colors group text-[12px] font-medium">
                <MessageSquare size={12} className="group-hover:hidden" />
                <LogOut size={12} className="hidden group-hover:block" />
                <span>{slackStatus.teamName}</span>
              </button>
            ) : (
              <button onClick={handleSlackConnect} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-colors text-[12px] font-medium">
                <MessageSquare size={12} />
                Connect Slack
              </button>
            )}
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[13px] font-semibold text-gray-900 leading-none mb-0.5">{userAuth.user?.name}</p>
              <p className="text-[11px] text-gray-500 leading-none">{userAuth.user?.email}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 border border-gray-200 flex items-center justify-center text-gray-700 font-bold text-xs shadow-sm">
              {userAuth.user?.name?.charAt(0) || "U"}
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-gray-900 transition-colors ml-1">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1100px] mx-auto px-6 py-8 flex flex-col">
        
        {/* Page Header */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              {searchQuery ? "Search Results" : activeTab === "dashboard" ? "Dashboard" : activeTab === "scheduled" ? "Email Queue" : "Sent History"}
            </h2>
            <p className="text-[13px] text-gray-500 mt-1">
              {searchQuery ? `Showing results for "${searchQuery}"` : "Monitor your outreach performance and queue status."}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative w-56 hidden sm:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Search campaigns..."
                className="w-full bg-white border border-gray-200 rounded-lg pl-8 pr-3 h-8 text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <button onClick={() => { refetchScheduled(); refetchSent(); }} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm rounded-lg transition-all" title="Refresh">
              <RefreshCw size={14} className={(isScheduledLoading || isSentLoading) ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setIsComposeOpen(true)}
              className="bg-gray-900 hover:bg-gray-800 text-white text-[13px] font-medium px-4 h-8 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Plus size={14} />
              New Campaign
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="w-full flex-1">
          
          {(!searchQuery && activeTab === "dashboard") && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between h-32">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-gray-400" />
                      <h3 className="text-[13px] font-medium text-gray-500">Total Queued</h3>
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-3xl font-bold tracking-tight text-gray-900">{totalScheduled}</p>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                      <TrendingUp size={10} />
                      Active
                    </span>
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between h-32">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-gray-400" />
                      <h3 className="text-[13px] font-medium text-gray-500">Delivered</h3>
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-3xl font-bold tracking-tight text-gray-900">{totalSent}</p>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-gray-500">
                      All time
                    </span>
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between h-32">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={14} className="text-gray-400" />
                      <h3 className="text-[13px] font-medium text-gray-500">Failed / Paused</h3>
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-3xl font-bold tracking-tight text-gray-900">{totalFailed}</p>
                    {totalFailed > 0 ? (
                      <span className="text-[11px] font-medium text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                        Requires attention
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        All clear
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Table */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-bold text-gray-900">Up Next in Queue</h3>
                  <button onClick={() => setActiveTab("scheduled")} className="text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors">
                    View all &rarr;
                  </button>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <EmailTable emails={(scheduledEmails || []).slice(0, 5)} isLoading={isScheduledLoading} />
                </div>
              </div>
            </div>
          )}

          {searchQuery.length > 2 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <EmailTable emails={searchResults || []} isLoading={isSearchLoading} />
            </div>
          )}

          {(!searchQuery && activeTab === "scheduled") && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <EmailTable emails={scheduledEmails || []} isLoading={isScheduledLoading} />
            </div>
          )}

          {(!searchQuery && activeTab === "sent") && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <EmailTable emails={sentEmails || []} isLoading={isSentLoading} />
            </div>
          )}

        </div>
      </main>

      {/* Compose Modal */}
      {isComposeOpen && (
        <ComposeModal
          onClose={() => setIsComposeOpen(false)}
          onSuccess={() => {
            setIsComposeOpen(false);
            refetchScheduled();
          }}
        />
      )}
    </div>
  );
}