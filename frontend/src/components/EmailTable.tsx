import React from "react";
import { format } from "date-fns";
import { Mail, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";

export default function EmailTable({ emails, isLoading }: { emails: any[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
        <p className="text-sm font-medium">Loading emails...</p>
      </div>
    );
  }

  if (!emails || emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-gray-50/50">
        <div className="w-12 h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center mb-4 shadow-sm">
          <Mail className="text-gray-400 w-6 h-6" strokeWidth={1.5} />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">No emails found</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-[250px] text-center">
          There are currently no emails in this queue. Create a new campaign to get started.
        </p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-medium bg-gray-100 text-gray-700 border border-gray-200 shadow-sm">
            <Clock size={12} /> Pending
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-medium bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
            <RefreshCw size={12} className="animate-spin" /> Sending...
          </span>
        );
      case "sent":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
            <CheckCircle2 size={12} /> Sent
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={12} /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
            <AlertCircle size={12} /> Unknown
          </span>
        );
    }
  };

  return (
    <div className="w-full bg-white">
      <table className="w-full text-left text-[14px] border-collapse">
        <thead className="bg-gray-50/50 border-b border-gray-200 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">
          <tr>
            <th className="px-6 py-3">Recipient</th>
            <th className="px-6 py-3">Subject</th>
            <th className="px-6 py-3">Time</th>
            <th className="px-6 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {emails.map((email) => (
            <tr key={email.id} className="hover:bg-gray-50/80 transition-colors duration-150">
              <td className="px-6 py-3.5 font-medium text-gray-900">{email.recipient}</td>
              <td className="px-6 py-3.5 truncate max-w-[250px] text-gray-500">{email.subject}</td>
              <td className="px-6 py-3.5 whitespace-nowrap text-gray-500 text-[13px]">
                {email.scheduledAt ? format(new Date(email.scheduledAt), "MMM d, h:mm a") : "-"}
              </td>
              <td className="px-6 py-3.5 whitespace-nowrap">
                {getStatusBadge(email.status)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
