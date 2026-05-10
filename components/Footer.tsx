"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Send, Camera, Globe, ExternalLink } from "lucide-react";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

export const Footer = () => {
  return (
    <footer className="py-10 md:py-12 border-t border-border">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 md:gap-10 mb-8 items-start">
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <div className="bg-primary p-1 rounded-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold font-display tracking-tight text-foreground">
                Kyvel<span className="text-primary">lo</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm leading-snug mb-3">
              {BRAND_TAGLINE}
            </p>
            <div className="flex items-center gap-3">
              <Send className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
              <Camera className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
              <Globe className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
              <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
            </div>
          </div>

          <div>
            <h4 className="text-foreground font-bold text-sm mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#features" className="hover:text-primary transition-colors">Features</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">AI Generator</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Scheduler</Link></li>
              <li><Link href="#pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-foreground font-bold text-sm mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Blog</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Careers</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Press</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-foreground font-bold text-sm mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-5 border-t border-border text-xs text-muted-foreground">
          <p>© 2026 {BRAND_NAME}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <p>Built with ❤️ for creators</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
