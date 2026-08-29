import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, Upload, Users, Clock, Settings, FileText, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import toast from "react-hot-toast";

const schema = z.object({
  senderId: z.string().min(1, "Sender is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  startTime: z.string().min(1, "Start time is required"),
  delaySeconds: z.number().min(0),
  hourlyLimit: z.number().min(1),
});

type FormData = z.infer<typeof schema>;

export default function ComposeModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const { data: senders } = useQuery({
    queryKey: ["senders"],
    queryFn: () => api.get("/senders").then((res) => res.data.senders),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      delaySeconds: 2,
      hourlyLimit: 20,
    },
  });

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
      const matches = text.match(emailRegex) || [];
      const uniqueEmails = Array.from(new Set(matches.map((e) => e.toLowerCase())));
      setRecipients(uniqueEmails);
      
      if (uniqueEmails.length === 0) {
        toast.error("No valid emails found in file.");
      } else {
        toast.success(`Found ${uniqueEmails.length} valid emails!`);
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const onSubmit = async (data: FormData) => {
    if (recipients.length === 0) {
      toast.error("Please upload at least one valid email address.");
      return;
    }
    try {
      setIsSubmitting(true);
      
      const payload = {
        ...data,
        startTime: new Date(data.startTime).toISOString(),
        recipients,
      };

      await api.post("/emails/schedule", payload);
      toast.success("Campaign scheduled successfully!");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Failed to schedule emails.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Create Campaign</h2>
            <p className="text-[15px] text-gray-500 mt-1">Configure and schedule your outreach</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-8 overflow-y-auto">
          <form id="compose-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Settings & Upload */}
            <div className="lg:col-span-5 space-y-8">
              {/* Section: Configuration */}
              <div className="bg-[#FAFAFA] rounded-2xl p-6 border border-gray-100">
                <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2 mb-6">
                  <Settings size={18} className="text-gray-400" /> Settings
                </h3>
                
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Sender Account</label>
                    <select
                      {...register("senderId")}
                      className="clean-input"
                    >
                      <option value="" className="text-gray-500">Select a sender...</option>
                      {senders?.map((s: any) => (
                        <option key={s.id} value={s.id} className="text-gray-900">
                          {s.email}
                        </option>
                      ))}
                    </select>
                    {errors.senderId && <p className="text-red-500 text-xs font-medium">{errors.senderId.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Start Time</label>
                    <input
                      type="datetime-local"
                      {...register("startTime")}
                      className="clean-input"
                    />
                    {errors.startTime && <p className="text-red-500 text-xs font-medium">{errors.startTime.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Delay (s)</label>
                      <div className="relative">
                        <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="number"
                          {...register("delaySeconds", { valueAsNumber: true })}
                          className="clean-input pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Limit / hr</label>
                      <div className="relative">
                        <Settings size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="number"
                          {...register("hourlyLimit", { valueAsNumber: true })}
                          className="clean-input pl-9"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Upload Leads */}
              <div className="bg-[#FAFAFA] rounded-2xl p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
                    <Users size={18} className="text-gray-400" /> Audience
                  </h3>
                  {recipients.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-[12px] font-medium border border-emerald-200">
                      <CheckCircle2 size={14} />
                      {recipients.length} Ready
                    </span>
                  )}
                </div>
                
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 cursor-pointer ${
                    isDragging 
                      ? "border-gray-900 bg-gray-50" 
                      : recipients.length > 0 
                        ? "border-emerald-200 bg-emerald-50/50" 
                        : "border-gray-300 hover:border-gray-400 hover:bg-gray-50 bg-white"
                  }`}
                >
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                    <Upload size={20} className="text-gray-400 mb-2" />
                    <p className="text-[13px] font-medium text-gray-900">
                      {isDragging ? "Drop here" : "Drag CSV or Click"}
                    </p>
                  </label>
                </div>
                
                {recipients.length > 0 && (
                  <div className="mt-4 bg-white rounded-lg p-3 text-xs border border-gray-200 shadow-sm max-h-[120px] overflow-y-auto">
                    <div className="flex flex-wrap gap-1.5">
                      {recipients.slice(0, 10).map((email, i) => (
                        <span key={i} className="bg-gray-50 border border-gray-200 px-2 py-0.5 rounded text-gray-600">
                          {email}
                        </span>
                      ))}
                      {recipients.length > 10 && (
                        <span className="bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-gray-500">
                          +{recipients.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Email Content */}
            <div className="lg:col-span-7">
              <div className="bg-[#FAFAFA] rounded-2xl p-6 border border-gray-100 h-full flex flex-col">
                <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2 mb-6">
                  <FileText size={18} className="text-gray-400" /> Email Content
                </h3>
                
                <div className="space-y-5 flex-1 flex flex-col">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Subject</label>
                    <input
                      type="text"
                      {...register("subject")}
                      className="clean-input"
                      placeholder="e.g. Quick question about your recent post"
                    />
                    {errors.subject && <p className="text-red-500 text-xs font-medium">{errors.subject.message}</p>}
                  </div>

                  <div className="space-y-2 flex-1 flex flex-col">
                    <label className="text-sm font-medium text-gray-700">Body</label>
                    <textarea
                      {...register("body")}
                      className="clean-input flex-1 min-h-[300px] resize-none"
                      placeholder="Hi there,&#10;&#10;I wanted to reach out because..."
                    />
                    {errors.body && <p className="text-red-500 text-xs font-medium">{errors.body.message}</p>}
                  </div>
                </div>
              </div>
            </div>
            
          </form>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-4 items-center">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="compose-form"
            disabled={isSubmitting || recipients.length === 0}
            className="btn-primary min-w-[160px]"
          >
            {isSubmitting ? "Scheduling..." : "Schedule Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}
