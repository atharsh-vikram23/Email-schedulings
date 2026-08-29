import React from "react";
import { Mail } from "lucide-react";

export default function Login() {
  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || "http://localhost:4000/api"}/auth/google`;
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-4">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center p-4 bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
          <Mail size={36} className="text-gray-900" strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-gray-900 mb-3">Welcome to ReachInbox</h1>
        <p className="text-[16px] text-gray-500 max-w-sm mx-auto">Sign in to start scheduling your email campaigns effortlessly.</p>
      </div>

      <div className="max-w-[400px] w-full bg-white border border-gray-200 rounded-3xl p-10 text-center shadow-sm">
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-sm text-[15px] font-medium text-gray-700 active:scale-[0.98] transition-all duration-200"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" width="20" height="20" alt="Google logo" />
          Continue with Google
        </button>
        
        <p className="mt-8 text-[13px] text-gray-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
