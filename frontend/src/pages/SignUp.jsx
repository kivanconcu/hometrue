import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PLANS = [
  { id: "starter", name: "Starter", price: "$9", period: "/mo", searches: "20 searches/mo", features: ["20 property analyses/mo", "PDF comp reports", "ARV calculator", "Email support"] },
  { id: "pro",     name: "Pro",     price: "$29", period: "/mo", searches: "200 searches/mo", features: ["200 property analyses/mo", "PDF comp reports", "ARV calculator", "Priority support", "API access"], popular: true },
  { id: "unlimited", name: "Unlimited", price: "$79", period: "/mo", searches: "Unlimited", features: ["Unlimited analyses", "PDF comp reports", "ARV calculator", "Dedicated support", "API access", "White-label reports"] },
];

export default function SignUp() {
  const { register } = useAuth();
  const navigate      = useNavigate();
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [plan, setPlan]           = useState("starter");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      await register(email, password, plan);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </div>
            <span className="text-2xl font-black text-gray-900">HomeTrue</span>
          </Link>
          <h1 className="text-3xl font-black text-gray-900 mt-6 mb-2">Choose your plan</h1>
          <p className="text-gray-500">Start analyzing properties today. Cancel anytime.</p>
        </div>

        {/* Plan selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {PLANS.map(p => (
            <div
              key={p.id}
              onClick={() => setPlan(p.id)}
              className={`relative cursor-pointer rounded-2xl border-2 p-5 transition ${
                plan === p.id ? "border-orange-500 bg-orange-50" : "border-gray-200 bg-white hover:border-orange-300"
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900">{p.name}</h3>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  plan === p.id ? "border-orange-500 bg-orange-500" : "border-gray-300"
                }`}>
                  {plan === p.id && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                </div>
              </div>
              <p className="text-2xl font-black text-gray-900">{p.price}<span className="text-sm font-normal text-gray-500">{p.period}</span></p>
              <p className="text-sm text-orange-600 font-medium mt-1 mb-3">{p.searches}</p>
              <ul className="space-y-1.5">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                    <svg className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Sign up form */}
        <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-5">Create your account</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border-2 border-gray-200 focus:border-orange-400 rounded-xl px-4 py-3 text-gray-900 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full border-2 border-gray-200 focus:border-orange-400 rounded-xl px-4 py-3 text-gray-900 focus:outline-none transition"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full btn-orange py-3.5 text-base font-bold disabled:opacity-50"
            >
              {loading ? "Creating account..." : `Start ${PLANS.find(p => p.id === plan)?.name} Plan →`}
            </button>
          </form>
          <p className="text-xs text-gray-400 text-center mt-4">
            By signing up you agree to our Terms of Service. Cancel anytime.
          </p>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account?{" "}
          <Link to="/signin" className="text-orange-500 hover:text-orange-600 font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
