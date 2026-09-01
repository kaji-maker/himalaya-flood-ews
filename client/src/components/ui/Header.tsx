'use client';

import React from 'react';
import Link from 'next/link';
import { Mountain, AlertTriangle, Radio, Activity } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-himalaya-card border-b border-himalaya-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & System Name */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="bg-blue-600/20 p-2 rounded-lg border border-blue-500/30 group-hover:border-blue-400 transition-colors">
              <Mountain className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Himalaya EWS
                <span className="text-xs bg-blue-500/20 text-blue-300 font-mono px-2 py-0.5 rounded border border-blue-500/30">
                  GLOF & Flood
                </span>
              </span>
              <p className="text-xs text-slate-400 hidden sm:block">
                Copernicus Sentinel-2 & NASA GPM Early Warning Pipeline
              </p>
            </div>
          </Link>

          {/* Navigation Basins */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/"
              className="px-3 py-1.5 text-sm font-medium rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Pan-Himalaya Overview
            </Link>
            <Link
              href="/basin/koshi"
              className="px-3 py-1.5 text-sm font-medium rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Koshi Basin
            </Link>
            <Link
              href="/basin/gandaki"
              className="px-3 py-1.5 text-sm font-medium rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Gandaki Basin
            </Link>
            <Link
              href="/basin/karnali"
              className="px-3 py-1.5 text-sm font-medium rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Karnali Basin
            </Link>
          </nav>

          {/* Live Pipeline Telemetry Indicator */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-full text-emerald-400 text-xs font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Pipeline Live
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
