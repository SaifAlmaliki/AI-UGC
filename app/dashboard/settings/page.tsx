'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Check, Loader2, Zap } from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('credits, plan')
        .eq('id', user.id)
        .single();
      setProfile(data);
    }
  };

  const handleSubscribe = async (plan: 'standard' | 'pro') => {
    try {
      setLoading(true);
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Something went wrong');
      }
    } catch (err: any) {
      alert('Error initiating checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Billing & Settings
        </h1>
        <p className="text-lg text-muted-foreground">
          Manage your subscription plan, credits, and account settings.
        </p>
      </div>

      <div className="bg-muted dark:bg-white/5 border border-border rounded-2xl p-6 backdrop-blur-md flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Current Status</h2>
          <p className="text-muted-foreground mt-1">
            Plan: <span className="text-primary font-bold uppercase">{profile?.plan || 'Free'}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-500">
            {profile?.credits ?? '...'}
          </p>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-1">Available Credits</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">Pricing Models</h2>
          <p className="text-muted-foreground mt-2">Choose the right plan to supercharge your AI Influencer journey.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 pt-6">
          {/* Free Plan */}
          <div className="relative flex flex-col p-8 bg-muted dark:bg-white/5 border border-border rounded-3xl backdrop-blur-sm transition-all duration-300 hover:bg-muted/80 dark:hover:bg-white/10">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-foreground">Free</h3>
              <div className="mt-4 flex items-baseline text-5xl font-extrabold text-foreground">
                $0
                <span className="ml-1 text-xl font-medium text-muted-foreground">/month</span>
              </div>
              <p className="mt-4 text-muted-foreground">Perfect for getting started with AI Influencers.</p>
            </div>
            <ul className="flex-1 space-y-4 text-foreground">
              <li className="flex items-center"><Check className="w-5 h-5 text-green-600 dark:text-green-400 mr-3 shrink-0" /> 300 Credits (initial)</li>
              <li className="flex items-center"><Check className="w-5 h-5 text-green-600 dark:text-green-400 mr-3 shrink-0" /> 50 Credits / AI Influencer Create</li>
              <li className="flex items-center"><Check className="w-5 h-5 text-green-600 dark:text-green-400 mr-3 shrink-0" /> 20 Credits / Create New Post</li>
              <li className="flex items-center"><Check className="w-5 h-5 text-green-600 dark:text-green-400 mr-3 shrink-0" /> 2 Social Media Connects</li>
              <li className="flex items-center"><Check className="w-5 h-5 text-green-600 dark:text-green-400 mr-3 shrink-0" /> 5 Max Autopost schedule</li>
            </ul>
            <div className="mt-8">
              <button disabled className="w-full py-4 px-6 rounded-xl font-bold text-muted-foreground bg-muted cursor-not-allowed border border-border">
                {profile?.plan === 'free' || !profile?.plan ? 'Current Plan' : 'Free Tier'}
              </button>
            </div>
          </div>

          {/* Standard Plan */}
          <div className="relative flex flex-col p-8 bg-gradient-to-b from-blue-50 to-card dark:from-blue-900/40 dark:to-blue-900/10 border border-blue-400/40 dark:border-blue-500/50 rounded-3xl backdrop-blur-md transform md:-translate-y-4 shadow-xl shadow-blue-500/15 dark:shadow-blue-900/20">
            <div className="absolute top-0 right-0 -mr-2 -mt-2 bg-gradient-to-r from-blue-500 to-purple-500 text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide flex items-center shadow-lg">
              <Zap className="w-3 h-3 mr-1" /> Popular
            </div>
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-foreground dark:text-white">Standard</h3>
              <div className="mt-4 flex items-baseline text-5xl font-extrabold text-foreground dark:text-white">
                $9.99
                <span className="ml-1 text-xl font-medium text-muted-foreground dark:text-white/50">/month</span>
              </div>
              <p className="mt-4 text-muted-foreground dark:text-white/70">Ideal for creators who post frequently.</p>
            </div>
            <ul className="flex-1 space-y-4 text-foreground dark:text-white/90">
              <li className="flex items-center"><Check className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 shrink-0" /> 2000 Credits / month</li>
              <li className="flex items-center"><Check className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 shrink-0" /> 50 Credits / AI Influencer Create</li>
              <li className="flex items-center"><Check className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 shrink-0" /> 20 Credits / Create New Post</li>
              <li className="flex items-center"><Check className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 shrink-0" /> 5 Social Media Connects</li>
              <li className="flex items-center"><Check className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 shrink-0" /> Unlimited Post schedule</li>
            </ul>
            <div className="mt-8">
              {profile?.plan === 'standard' ? (
                <button disabled className="w-full py-4 px-6 rounded-xl font-bold text-primary-foreground bg-blue-500/90 cursor-default border border-blue-500/50 opacity-95">
                  Current Plan
                </button>
              ) : (
                <button 
                  onClick={() => handleSubscribe('standard')}
                  disabled={loading}
                  className="w-full py-4 px-6 rounded-xl font-bold text-primary-foreground bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg hover:shadow-blue-500/25 flex justify-center items-center"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Subscribe to Standard'}
                </button>
              )}
            </div>
          </div>

          {/* Pro Plan */}
          <div className="relative flex flex-col p-8 bg-muted dark:bg-white/5 border border-purple-500/35 rounded-3xl backdrop-blur-sm transition-all duration-300 hover:bg-muted/80 dark:hover:bg-white/10 hover:border-purple-500/50">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-foreground">Pro</h3>
              <div className="mt-4 flex items-baseline text-5xl font-extrabold text-foreground">
                $29.99
                <span className="ml-1 text-xl font-medium text-muted-foreground">/month</span>
              </div>
              <p className="mt-4 text-muted-foreground">For serious creators and agencies.</p>
            </div>
            <ul className="flex-1 space-y-4 text-foreground">
              <li className="flex items-center"><Check className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-3 shrink-0" /> 10000 Credits / month</li>
              <li className="flex items-center"><Check className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-3 shrink-0" /> 50 Credits / AI Influencer Create</li>
              <li className="flex items-center"><Check className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-3 shrink-0" /> 20 Credits / Create New Post</li>
              <li className="flex items-center"><Check className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-3 shrink-0" /> Unlimited Social Media Connects</li>
              <li className="flex items-center"><Check className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-3 shrink-0" /> Unlimited Post schedule</li>
            </ul>
            <div className="mt-8">
               {profile?.plan === 'pro' ? (
                <button disabled className="w-full py-4 px-6 rounded-xl font-bold text-primary-foreground bg-purple-600/90 cursor-default border border-purple-500/50 opacity-95">
                  Current Plan
                </button>
              ) : (
                <button 
                  onClick={() => handleSubscribe('pro')}
                  disabled={loading}
                  className="w-full py-4 px-6 rounded-xl font-bold text-primary-foreground bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 transition-all shadow-lg hover:shadow-purple-500/25 flex justify-center items-center"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Subscribe to Pro'}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
