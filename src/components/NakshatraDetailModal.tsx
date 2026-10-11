import React from 'react';
import { NAKSHATRAS } from '../data/nakshatrasData';
import { X, Crosshair, Sparkles, Star, Compass, Shield } from 'lucide-react';

interface NakshatraDetailModalProps {
  nakshatraId: number | null;
  onClose: () => void;
  onFocusInSky?: (nakshatraId: number) => void;
}

export const NakshatraDetailModal: React.FC<NakshatraDetailModalProps> = ({
  nakshatraId,
  onClose,
  onFocusInSky,
}) => {
  if (nakshatraId === null) return null;
  const nakshatra = NAKSHATRAS.find((n) => n.id === nakshatraId);
  if (!nakshatra) return null;

  // Calculate bounding box for SVG preview of asterism
  const stars = nakshatra.shape.stars;
  const raValues = stars.map((s) => s.ra);
  const decValues = stars.map((s) => s.dec);

  const minRa = Math.min(...raValues);
  const maxRa = Math.max(...raValues);
  const minDec = Math.min(...decValues);
  const maxDec = Math.max(...decValues);

  const raSpan = Math.max(0.5, maxRa - minRa);
  const decSpan = Math.max(0.5, maxDec - minDec);

  const svgPadding = 30;
  const svgWidth = 260;
  const svgHeight = 160;

  const toSvgX = (ra: number) => {
    // In sky coordinates, RA increases to the left (East)
    return svgPadding + ((maxRa - ra) / raSpan) * (svgWidth - svgPadding * 2);
  };

  const toSvgY = (dec: number) => {
    // Dec increases upwards (North)
    return svgPadding + ((maxDec - dec) / decSpan) * (svgHeight - svgPadding * 2);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] sm:max-h-[90vh] bg-gray-950/95 backdrop-blur-xl border-t border-gray-800 shadow-2xl overflow-y-auto rounded-t-2xl sm:rounded-2xl sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[560px] sm:border">
      {/* Header */}
      <div className="sticky top-0 bg-gray-950/90 backdrop-blur-md px-6 py-4 border-b border-gray-800/80 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{nakshatra.symbolIcon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-cinzel text-amber-400">
                {nakshatra.sanskrit} ({nakshatra.name})
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              नक्षत्र #{nakshatra.id} (Nakshatra #{nakshatra.id} of 27) · {nakshatra.rashiSpan}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-gray-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Asterism Vector Shape Preview */}
        <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              Asterism Star Points & Shape
            </span>
            <span className="text-xs text-slate-400">
              {stars.length} principal stars
            </span>
          </div>

          <div className="relative w-full h-[160px] bg-black/60 rounded-lg flex items-center justify-center overflow-hidden border border-gray-800/60">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-full"
            >
              <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Connecting Asterism lines */}
              {nakshatra.shape.lines.map(([i1, i2], idx) => {
                const s1 = stars[i1];
                const s2 = stars[i2];
                if (!s1 || !s2) return null;
                return (
                  <line
                    key={idx}
                    x1={toSvgX(s1.ra)}
                    y1={toSvgY(s1.dec)}
                    x2={toSvgX(s2.ra)}
                    y2={toSvgY(s2.dec)}
                    stroke="#F59E0B"
                    strokeWidth="1.8"
                    strokeDasharray="4 2"
                    opacity="0.85"
                  />
                );
              })}

              {/* Star points */}
              {stars.map((star, idx) => {
                const x = toSvgX(star.ra);
                const y = toSvgY(star.dec);
                const isYogatara = idx === 0;
                return (
                  <g key={star.id}>
                    {/* Glow ring */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isYogatara ? 8 : 6}
                      fill="#F59E0B"
                      opacity={isYogatara ? '0.4' : '0.2'}
                      filter="url(#glow)"
                    />
                    {/* Star core */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isYogatara ? 4 : 3}
                      fill={isYogatara ? '#FFFBEB' : '#FDE68A'}
                    />
                    {/* Star name label */}
                    <text
                      x={x + 7}
                      y={y + 3}
                      fill="#CBD5E1"
                      fontSize="9"
                      fontFamily="sans-serif"
                    >
                      {star.properName || star.id}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <div>
              <span className="text-slate-400">Principal Junction Star (Yogatara): </span>
              <span className="text-amber-300 font-medium">{nakshatra.yogatara}</span>
            </div>
            {onFocusInSky && (
              <button
                onClick={() => onFocusInSky(nakshatra.id)}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors font-medium text-xs border border-amber-500/30"
              >
                <Crosshair className="w-3.5 h-3.5" />
                Focus in Sky Map
              </button>
            )}
          </div>
        </div>

        {/* Essential Cosmic Attributes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-gray-900/60 border border-gray-800">
            <span className="text-xs text-slate-400 block">देवता (Deity)</span>
            <span className="text-sm font-medium text-slate-200 mt-0.5 block">
              {nakshatra.deity}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-gray-900/60 border border-gray-800">
            <span className="text-xs text-slate-400 block">स्वामी ग्रह (Graha Lord)</span>
            <span className="text-sm font-medium text-amber-300 mt-0.5 block">
              {nakshatra.grahaLord}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-gray-900/60 border border-gray-800">
            <span className="text-xs text-slate-400 block">प्रतीक (Symbol)</span>
            <span className="text-sm font-medium text-slate-200 mt-0.5 block">
              {nakshatra.symbol}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-gray-900/60 border border-gray-800">
            <span className="text-xs text-slate-400 block">तत्त्व (Element)</span>
            <span className="text-sm font-medium text-slate-200 mt-0.5 block">
              {nakshatra.element}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-gray-900/60 border border-gray-800">
            <span className="text-xs text-slate-400 block">गण (Gana)</span>
            <span className="text-sm font-medium text-slate-200 mt-0.5 block">
              {nakshatra.gana}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-gray-900/60 border border-gray-800">
            <span className="text-xs text-slate-400 block">राशि विस्तार (Sidereal Span)</span>
            <span className="text-sm font-mono text-slate-300 mt-0.5 block">
              {nakshatra.startDeg.toFixed(1)}° – {nakshatra.endDeg.toFixed(1)}°
            </span>
          </div>
        </div>

        {/* Mythology & Astrological Qualities */}
        <div className="space-y-3">
          <div>
            <h4 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
              गुण एवं स्वभाव (Astrological Qualities)
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              {nakshatra.qualities}
            </p>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
              पौराणिक संदर्भ (Cosmic Lore & Significance)
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              {nakshatra.mythology}
            </p>
          </div>
        </div>

        {/* Padas (Quarters) Breakdown */}
        <div>
          <h4 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
            चार चरण (The Four Padas & Navamsha)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {nakshatra.padas.map((pada) => (
              <div
                key={pada.number}
                className="p-2.5 rounded-lg bg-gray-900/80 border border-gray-800 text-center"
              >
                <div className="text-xs font-bold text-amber-400">
                  चरण {pada.number} (Pada {pada.number})
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  {pada.navamsha}
                </div>
                <div className="text-xs font-mono text-slate-400 mt-1">
                  ध्वनि: {pada.syllable}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
