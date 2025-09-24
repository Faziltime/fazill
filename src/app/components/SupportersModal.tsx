"use client";
import React from "react";

interface SupportersModalProps {
  onCloseAction: () => void;
}

export default function SupportersModal({ onCloseAction }: SupportersModalProps) {
  const supporters = [
    { name: 'Fazil', image: '/Fazil.jpeg' },
    { name: 'Syed Uzair', image: '/syed.jpg' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-white w-screen h-screen">
      {/* Custom CSS animations */}
      <style jsx>{`
        @keyframes expandWidth {
          0% { width: 0%; }
          50% { width: 100%; }
          100% { width: 0%; }
        }
        
        @keyframes premiumGlow {
          0% { 
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.3),
                       0 0 40px rgba(59, 130, 246, 0.2),
                       0 0 60px rgba(59, 130, 246, 0.1);
          }
          50% { 
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.5),
                       0 0 60px rgba(59, 130, 246, 0.3),
                       0 0 90px rgba(59, 130, 246, 0.2);
          }
          100% { 
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.3),
                       0 0 40px rgba(59, 130, 246, 0.2),
                       0 0 60px rgba(59, 130, 246, 0.1);
          }
        }
        
        @keyframes textShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        
        .premium-glow {
          animation: premiumGlow 3s ease-in-out infinite;
        }
        
        .text-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          background-size: 200% 100%;
          animation: textShimmer 2s ease-in-out infinite;
        }
      `}</style>
      {/* High contrast black grid background */}
      <div className="absolute inset-0 opacity-[0.25]">
        {/* Main grid - larger squares */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.6) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.6) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px'
        }} />
        {/* Fine grid - smaller squares */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.4) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }} />
        {/* Extra fine grid for detail */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.25) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.25) 1px, transparent 1px)
          `,
          backgroundSize: '10px 10px'
        }} />
      </div>

      {/* Cool X and Y axis lines */}
      <div className="absolute inset-0 opacity-[0.08]">
        {/* Y-axis (vertical) */}
        <div className="absolute left-1/4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-gray-400 to-transparent" />
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-gray-300 to-transparent" />
        <div className="absolute left-3/4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-gray-400 to-transparent" />
        
        {/* X-axis (horizontal) */}
        <div className="absolute top-1/4 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent" />
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
        <div className="absolute top-3/4 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent" />
        
        {/* Origin point */}
        <div className="absolute left-1/2 top-1/2 w-2 h-2 bg-gray-500 rounded-full transform -translate-x-1 -translate-y-1" />
        
        {/* Axis labels */}
        <div className="absolute left-1/4 top-4 text-xs font-mono text-gray-400 transform -translate-x-1/2">Y</div>
        <div className="absolute left-4 top-1/4 text-xs font-mono text-gray-400 transform -translate-y-1/2">X</div>
        
        {/* Grid intersection points */}
        <div className="absolute left-1/4 top-1/4 w-1 h-1 bg-gray-300 rounded-full transform -translate-x-0.5 -translate-y-0.5" />
        <div className="absolute left-1/2 top-1/4 w-1 h-1 bg-gray-300 rounded-full transform -translate-x-0.5 -translate-y-0.5" />
        <div className="absolute left-3/4 top-1/4 w-1 h-1 bg-gray-300 rounded-full transform -translate-x-0.5 -translate-y-0.5" />
        <div className="absolute left-1/4 top-1/2 w-1 h-1 bg-gray-300 rounded-full transform -translate-x-0.5 -translate-y-0.5" />
        <div className="absolute left-3/4 top-1/2 w-1 h-1 bg-gray-300 rounded-full transform -translate-x-0.5 -translate-y-0.5" />
        <div className="absolute left-1/4 top-3/4 w-1 h-1 bg-gray-300 rounded-full transform -translate-x-0.5 -translate-y-0.5" />
        <div className="absolute left-1/2 top-3/4 w-1 h-1 bg-gray-300 rounded-full transform -translate-x-0.5 -translate-y-0.5" />
        <div className="absolute left-3/4 top-3/4 w-1 h-1 bg-gray-300 rounded-full transform -translate-x-0.5 -translate-y-0.5" />
      </div>

      {/* Ultra Premium Close Button */}
      <button
        className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-all duration-300 p-4 rounded-full hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 hover:scale-110 group z-50 font-mono"
        onClick={onCloseAction}
        aria-label="Close"
      >
        {/* Button glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 via-pink-500/30 to-rose-600/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Main button content */}
        <div className="relative z-10 flex items-center gap-2">
          <span className="material-icons text-2xl group-hover:rotate-90 transition-transform duration-300">close</span>
          <span className="text-sm font-mono tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300">CLOSE</span>
        </div>
        
        {/* Corner accents */}
        <div className="absolute -top-1 -left-1 w-3 h-3 border-t border-l border-red-400 rounded-tl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b border-r border-rose-400 rounded-br opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </button>

      {/* Ultra Premium Title - Centered */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-30">
        <div className="relative">
          {/* Title glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-blue-500/30 to-purple-600/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          {/* Main title */}
          <h1 className="relative z-10 font-mono text-4xl font-bold text-gray-800 tracking-[0.3em] uppercase text-center">
            SUPPORTERS
          </h1>
          
          {/* Premium underline with animation */}
          <div className="relative mt-4 flex justify-center">
            <div className="w-24 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-full shadow-lg shadow-blue-500/30" />
            <div className="absolute top-0 left-0 w-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-full animate-pulse" 
                 style={{ animation: 'expandWidth 2s ease-in-out infinite' }} />
          </div>
          
          {/* Corner accents */}
          <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg opacity-60" />
          <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-purple-400 rounded-tr-lg opacity-60" />
        </div>
      </div>

      {/* Ultra Premium Supporters Display */}
      <div className="h-full w-full flex items-center justify-center">
        <div className="flex items-center justify-center gap-32 max-w-6xl">
          {supporters.map((supporter, index) => (
            <div key={index} className="relative group flex flex-col items-center">
              {/* Multi-layered premium glow system */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-blue-500/30 to-purple-600/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-1000 group-hover:scale-125 group-hover:rotate-3" />
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/15 via-teal-500/25 to-cyan-600/15 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-1200 group-hover:scale-110 group-hover:-rotate-2" />
              <div className="absolute inset-0 bg-gradient-to-r from-rose-400/10 via-pink-500/20 to-fuchsia-600/10 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-800 group-hover:scale-105 group-hover:rotate-1" />

              {/* Ultra Premium Large Circular Profile Image */}
              <div className="relative z-20 group-hover:scale-110 transition-all duration-700 mb-6">
                {/* Image glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/30 via-blue-500/40 to-purple-600/30 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 group-hover:scale-125" />
                
                {/* Main image container - Much larger */}
                <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-white shadow-2xl group-hover:shadow-[0_0_60px_rgba(59,130,246,0.5)] transition-all duration-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={supporter.image} 
                    alt={supporter.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  
                  {/* Minimal industrial overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900/5 via-transparent to-gray-800/8 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  
                  {/* Minimal industrial border */}
                  <div className="absolute inset-0 rounded-full border-2 border-transparent bg-gradient-to-r from-gray-600 via-gray-500 to-gray-700 opacity-0 group-hover:opacity-60 transition-opacity duration-700" 
                       style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'xor' }} />
                </div>
                
                {/* Minimal industrial particles */}
                <div className="absolute -top-3 -right-3 w-3 h-3 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full opacity-0 group-hover:opacity-80 group-hover:animate-pulse transition-opacity duration-500 shadow-md shadow-gray-600/30" />
                <div className="absolute -bottom-3 -left-3 w-2 h-2 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full opacity-0 group-hover:opacity-70 group-hover:animate-pulse transition-opacity duration-700 shadow-md shadow-gray-500/30" />
                <div className="absolute top-1/2 -left-6 w-2 h-2 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full opacity-0 group-hover:opacity-60 group-hover:animate-pulse transition-opacity duration-600 shadow-md shadow-gray-400/30" />
                <div className="absolute top-1/2 -right-6 w-2 h-2 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full opacity-0 group-hover:opacity-70 group-hover:animate-pulse transition-opacity duration-800 shadow-md shadow-gray-500/30" />
              </div>

              {/* Ultra premium name container - Smaller and under image */}
              <div className="relative z-20 font-mono text-black text-2xl font-light tracking-[0.2em] text-center p-6 rounded-2xl bg-gradient-to-br from-white to-gray-100 backdrop-blur-xl border-2 shadow-xl group-hover:shadow-[0_0_40px_rgba(59,130,246,0.3)] group-hover:shadow-blue-500/30 transition-all duration-700 group-hover:scale-105 premium-glow">
                {supporter.name}

                {/* Advanced inner lighting system */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 via-transparent to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-600" />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tl from-cyan-100/30 via-transparent to-blue-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-800" />

                {/* Premium animated border system */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-400/30 via-blue-500/40 to-purple-600/30 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-sm group-hover:blur-none" />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400/20 via-teal-500/30 to-cyan-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-900 blur-md group-hover:blur-sm" />

                {/* Ultra premium text effects */}
                <div className="absolute inset-0 rounded-2xl text-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Advanced text shadow */}
                <div className="absolute inset-0 rounded-2xl text-2xl font-light tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 opacity-0 group-hover:opacity-20 transition-opacity duration-700 blur-sm" style={{ WebkitTextStroke: '1px rgba(0,0,0,0.1)' }}>
                  {supporter.name}
                </div>
              </div>

              {/* Advanced floating particle system for name container */}
              <div className="absolute -top-4 -right-4 w-3 h-3 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-500 shadow-lg shadow-cyan-400/50" />
              <div className="absolute -bottom-4 -left-4 w-2.5 h-2.5 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-700 shadow-lg shadow-purple-400/50" />
              <div className="absolute top-1/2 -left-6 w-2 h-2 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-600 shadow-lg shadow-emerald-400/50" />
              <div className="absolute top-1/2 -right-6 w-2 h-2 bg-gradient-to-r from-rose-400 to-fuchsia-500 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-800 shadow-lg shadow-rose-400/50" />

              {/* Premium connecting line */}
              {index === 0 && (
                <div className="absolute top-1/2 -right-16 w-32 h-1 bg-gradient-to-r from-cyan-300/50 via-blue-400/70 to-purple-500/50 opacity-0 group-hover:opacity-100 transition-all duration-700 group-hover:shadow-lg group-hover:shadow-blue-400/30 rounded-full" />
              )}

              {/* Ultra premium corner accents */}
              <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-gradient-to-r from-cyan-400 to-blue-500 rounded-tl-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-gradient-to-r from-purple-400 to-pink-500 rounded-tr-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-gradient-to-r from-emerald-400 to-teal-500 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-gradient-to-r from-rose-400 to-fuchsia-500 rounded-br-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
