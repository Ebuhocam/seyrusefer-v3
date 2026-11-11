"use client";
import { useState } from 'react';

// ==========================================
// ⚙️ HARİTA VE BİNA KONUM AYARLARI
// ==========================================

// 1. BAŞLANGIÇTA HARİTADA OLAN SABİT BİNALAR
const SABIT_BINALAR = {
  cami: { top: '59%', left: '40%', width: '9%' },
  otag: { top: '48%', left: '56%', width: '9%' },
  seyyah: { top: '82%', left: '55%', width: '7%' } // Seyyah karakteri olduğu için biraz daha küçük
};

// 2. BOŞ ARSA AYARLARI (Görselinizdeki işaretli yerler)
const INITIAL_PLOTS = [
    { id: 'arsa1', top: '38%', left: '44%', width: '8%', building: null }, // Cami üstü
    { id: 'arsa2', top: '35%', left: '69%', width: '7%', building: null }, // Otağ üstü
  { id: 'arsa3', top: '52%', left: '78%', width: '10%', building: null }, // Otağ sağı
  { id: 'arsa4', top: '68%', left: '68%', width: '10%', building: null }, // Otağ altı
];

// 3. İNŞA EDİLEBİLECEK BİNALARIN KATALOĞU (Level 1 görselleriyle başlar)
const BUILDING_CATALOG = [
  { id: 'medrese', name: 'Medrese', imageBase: '/assets/medrese', maxLevel: 4, hasLevels: true },
  { id: 'sosyalmeydan', name: 'Sosyal Meydan', imageBase: '/assets/sosyalmeydan', maxLevel: 4, hasLevels: true },
  { id: 'oyuncadiri', name: 'Oyun Çadırı', imageBase: '/assets/oyuncadiri', maxLevel: 1, hasLevels: false },
  { id: 'takasmerkezi', name: 'Takas Merkezi', imageBase: '/assets/takasmerkezi', maxLevel: 1, hasLevels: false },
];

export default function BirlikAdasi() {
  // --- HAFIZA (STATE) BÖLÜMÜ ---
  
  // Sabit binaların seviyeleri (Artık Level 1'den başlıyor)
  const [camiLevel, setCamiLevel] = useState(1);
  const [otagLevel, setOtagLevel] = useState(1);
  
  // Menü ve Arsa Kontrolleri
  const [activeMenu, setActiveMenu] = useState(null); // 'cami', 'otag', 'seyyah', 'build', 'plot_upgrade', null
  const [selectedPlotId, setSelectedPlotId] = useState(null);
  const [plots, setPlots] = useState(INITIAL_PLOTS);

  // --- FONKSİYONLAR ---
  
  const closeMenu = () => {
    setActiveMenu(null);
    setSelectedPlotId(null);
  };

  const openBuildMenu = (arsaId) => {
    setSelectedPlotId(arsaId);
    setActiveMenu('build');
  };

  const openPlotMenu = (arsaId) => {
    setSelectedPlotId(arsaId);
    setActiveMenu('plot_upgrade');
  };

  const buildOnPlot = (secilenBina) => {
    setPlots(oncekiArsalar => 
      oncekiArsalar.map(arsa => {
        if (arsa.id === selectedPlotId) {
          return { 
            ...arsa, 
            building: { 
              ...secilenBina, 
              currentLevel: 1 // Yeni inşa edilen bina 1. seviyeden başlar
            } 
          };
        }
        return arsa;
      })
    );
    closeMenu();
  };

  const upgradePlotBuilding = () => {
    setPlots(oncekiArsalar => 
      oncekiArsalar.map(arsa => {
        if (arsa.id === selectedPlotId && arsa.building.hasLevels && arsa.building.currentLevel < arsa.building.maxLevel) {
          return {
            ...arsa,
            building: { ...arsa.building, currentLevel: arsa.building.currentLevel + 1 }
          };
        }
        return arsa;
      })
    );
    closeMenu();
  };

  const upgradeCami = () => {
    if (camiLevel < 4) setCamiLevel(prev => prev + 1);
  };

  const upgradeOtag = () => {
    if (otagLevel < 4) setOtagLevel(prev => prev + 1);
  };

  // Dinamik resim yolu oluşturucu
  const getBuildingImage = (building) => {
    if (building.hasLevels) return `${building.imageBase}${building.currentLevel}.png`;
    return `${building.imageBase}.png`;
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900 flex items-center justify-center font-sans">
      
      {/* HARİTA KONTEYNERİ */}
      <div className="relative w-full max-w-7xl aspect-video border-4 border-slate-700 shadow-2xl rounded-xl overflow-hidden">
        
        {/* ARKA PLAN */}
        <img src="/birlikkasabasi.png" alt="Birlik Kasabası" className="absolute inset-0 w-full h-full object-cover" />

        {/* 1. SABİT BİNA: CAMİ */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform duration-300 z-20 flex flex-col items-center group"
          style={{ top: SABIT_BINALAR.cami.top, left: SABIT_BINALAR.cami.left, width: SABIT_BINALAR.cami.width }}
          onClick={() => setActiveMenu('cami')}
        >
          <img src={`/assets/cami${camiLevel}.png`} alt="Birlik Camii" className="w-full h-auto drop-shadow-2xl" />
          <div className="absolute -top-4 -right-4 bg-amber-500 text-white font-black text-sm w-7 h-7 flex items-center justify-center rounded-full border-2 border-slate-900 shadow-lg z-10 group-hover:bg-amber-400 transition-colors">
            {camiLevel}
          </div>
          <div className="absolute -bottom-6 bg-slate-900/90 text-white text-[10px] md:text-xs font-bold px-3 py-1.5 rounded border border-slate-600 whitespace-nowrap shadow-xl backdrop-blur-sm group-hover:border-amber-500 transition-colors">
            Birlik Camii
          </div>
        </div>

        {/* 2. SABİT BİNA: OTAĞ */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform duration-300 z-20 flex flex-col items-center group"
          style={{ top: SABIT_BINALAR.otag.top, left: SABIT_BINALAR.otag.left, width: SABIT_BINALAR.otag.width }}
          onClick={() => setActiveMenu('otag')}
        >
          <img src={`/assets/otag${otagLevel}.png`} alt="Otağ" className="w-full h-auto drop-shadow-2xl" />
          <div className="absolute -top-4 -right-4 bg-blue-500 text-white font-black text-sm w-7 h-7 flex items-center justify-center rounded-full border-2 border-slate-900 shadow-lg z-10 group-hover:bg-blue-400 transition-colors">
            {otagLevel}
          </div>
          <div className="absolute -bottom-6 bg-slate-900/90 text-white text-[10px] md:text-xs font-bold px-3 py-1.5 rounded border border-slate-600 whitespace-nowrap shadow-xl backdrop-blur-sm group-hover:border-blue-500 transition-colors">
            Otağ
          </div>
        </div>

        {/* 3. SABİT KARAKTER: SEYYAH */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform duration-300 z-20 flex flex-col items-center group"
          style={{ top: SABIT_BINALAR.seyyah.top, left: SABIT_BINALAR.seyyah.left, width: SABIT_BINALAR.seyyah.width }}
          onClick={() => setActiveMenu('seyyah')}
        >
          <img src={`/assets/seyyaherkek.png`} alt="Seyyah" className="w-full h-auto drop-shadow-2xl" />
          <div className="absolute -bottom-6 bg-slate-900/90 text-white text-[10px] md:text-xs font-bold px-3 py-1.5 rounded border border-slate-600 whitespace-nowrap shadow-xl backdrop-blur-sm group-hover:border-red-500 transition-colors">
            Seyyah
          </div>
        </div>

        {/* 4. DİĞER BOŞ ARSALAR VE İNŞA EDİLEN BİNALAR */}
        {INITIAL_PLOTS.map((sabitArsa) => {
          const arsaDurumu = plots.find(p => p.id === sabitArsa.id) || sabitArsa;

          return (
            <div
              key={sabitArsa.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 z-10"
              style={{ top: sabitArsa.top, left: sabitArsa.left, width: sabitArsa.width }}
              onClick={() => !arsaDurumu.building ? openBuildMenu(sabitArsa.id) : openPlotMenu(sabitArsa.id)}
            >
              {/* EĞER ARSA BOŞSA */}
              {!arsaDurumu.building && (
                <div className="relative w-full aspect-square flex items-center justify-center group">
                  <div 
                    className="absolute w-full h-full border-[3px] border-dashed border-amber-500/80 bg-amber-500/20 rounded-lg group-hover:bg-amber-500/40 group-hover:border-amber-400 transition-all duration-300"
                    style={{ transform: 'rotateX(60deg) rotateZ(45deg)' }}
                  ></div>
                  <div className="relative z-10 flex flex-col items-center pointer-events-none drop-shadow-2xl">
                    <span className="text-4xl text-white font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">+</span>
                    <span className="text-[9px] md:text-[10px] font-bold text-white mt-1 bg-slate-900/80 px-2 py-1 rounded backdrop-blur-sm border border-slate-700 shadow-lg tracking-widest uppercase">
                      İnşa Et
                    </span>
                  </div>
                </div>
              )}

              {/* EĞER ARSAYA BİNA DİKİLDİYSE */}
              {arsaDurumu.building && (
                <div className="relative w-full flex items-center justify-center flex-col group">
                  <img src={getBuildingImage(arsaDurumu.building)} alt={arsaDurumu.building.name} className="w-full h-auto drop-shadow-2xl" />
                  
                  {arsaDurumu.building.hasLevels && (
                    <div className="absolute -top-4 -right-4 bg-emerald-500 text-white font-black text-sm w-7 h-7 flex items-center justify-center rounded-full border-2 border-slate-900 shadow-lg z-10 group-hover:bg-emerald-400 transition-colors">
                      {arsaDurumu.building.currentLevel}
                    </div>
                  )}

                  <div className="absolute -bottom-6 bg-slate-900/90 text-white text-[10px] md:text-xs font-bold px-3 py-1.5 rounded border border-slate-600 whitespace-nowrap shadow-xl backdrop-blur-sm group-hover:border-emerald-500 transition-colors">
                    {arsaDurumu.building.name}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ========================================== */}
      {/* AÇILAN MENÜLER (POP-UP'LAR)                */}
      {/* ========================================== */}

      {/* A. CAMİ MENÜSÜ */}
      {activeMenu === 'cami' && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm" onClick={closeMenu}>
          <div className="bg-slate-800 border-2 border-amber-500 p-6 rounded-2xl shadow-[0_0_40px_rgba(245,158,11,0.2)] max-w-sm w-full m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">🕌 Birlik Camii</h2>
              <button onClick={closeMenu} className="text-slate-400 hover:text-red-500 text-3xl font-black leading-none transition-colors">&times;</button>
            </div>
            <div className="text-center mb-6">
              <img src={`/assets/cami${camiLevel}.png`} className="w-32 h-32 object-contain mx-auto mb-4 drop-shadow-xl" alt="Cami" />
              <p className="text-gray-300 text-sm">Şu anki seviye: <span className="font-bold text-amber-400">Level {camiLevel}</span></p>
            </div>
            <div className="flex flex-col gap-3">
              {camiLevel < 4 ? (
                <button onClick={upgradeCami} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2">
                  <span>⬆️</span> Seviye Yükselt
                </button>
              ) : (
                <button disabled className="w-full bg-slate-700 text-gray-400 font-bold py-3 rounded-xl cursor-not-allowed border border-slate-600">
                  🌟 Maksimum Seviyeye Ulaşıldı
                </button>
              )}
              <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2">
                <span>📖</span> Camiye Gir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B. OTAĞ MENÜSÜ */}
      {activeMenu === 'otag' && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm" onClick={closeMenu}>
          <div className="bg-slate-800 border-2 border-blue-500 p-6 rounded-2xl shadow-[0_0_40px_rgba(59,130,246,0.2)] max-w-sm w-full m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">🛡️ Otağ</h2>
              <button onClick={closeMenu} className="text-slate-400 hover:text-red-500 text-3xl font-black leading-none transition-colors">&times;</button>
            </div>
            <div className="text-center mb-6">
              <img src={`/assets/otag${otagLevel}.png`} className="w-32 h-32 object-contain mx-auto mb-4 drop-shadow-xl" alt="Otağ" />
              <p className="text-gray-300 text-sm">Şu anki seviye: <span className="font-bold text-blue-400">Level {otagLevel}</span></p>
            </div>
            <div className="flex flex-col gap-3">
              {otagLevel < 4 ? (
                <button onClick={upgradeOtag} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2">
                  <span>⬆️</span> Seviye Yükselt
                </button>
              ) : (
                <button disabled className="w-full bg-slate-700 text-gray-400 font-bold py-3 rounded-xl cursor-not-allowed border border-slate-600">
                  🌟 Maksimum Seviyeye Ulaşıldı
                </button>
              )}
              <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2">
                <span>💬</span> Otağa Gir (Mesajlar)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* C. SEYYAH MENÜSÜ */}
      {activeMenu === 'seyyah' && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm" onClick={closeMenu}>
          <div className="bg-slate-800 border-2 border-red-500 p-6 rounded-2xl shadow-[0_0_40px_rgba(239,68,68,0.2)] max-w-sm w-full m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">⛵ Seyyah</h2>
              <button onClick={closeMenu} className="text-slate-400 hover:text-red-500 text-3xl font-black leading-none transition-colors">&times;</button>
            </div>
            <div className="text-center mb-6">
              <img src={`/assets/seyyaherkek.png`} className="w-32 h-32 object-contain mx-auto mb-4 drop-shadow-xl" alt="Seyyah" />
              <p className="text-gray-300 text-sm">Seyyah yola çıkmak için seni bekliyor.</p>
            </div>
            <button className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2">
              <span>✉️</span> Zarf Aç
            </button>
          </div>
        </div>
      )}

      {/* D. BOŞ ARSA İNŞAAT MENÜSÜ */}
      {activeMenu === 'build' && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm" onClick={closeMenu}>
          <div className="bg-slate-800 border-2 border-amber-500 p-6 rounded-2xl shadow-[0_0_40px_rgba(245,158,11,0.2)] max-w-lg w-full m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">🏗️ Ne inşa etmek istersin?</h2>
              <button onClick={closeMenu} className="text-slate-400 hover:text-red-500 text-3xl font-black leading-none transition-colors">&times;</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {BUILDING_CATALOG.map((bina) => (
                <button key={bina.id} onClick={() => buildOnPlot(bina)} className="bg-slate-900 border border-slate-700 hover:border-emerald-500 hover:bg-slate-800 rounded-xl p-4 flex flex-col items-center transition-all duration-300 group shadow-lg">
                  <div className="w-16 h-16 mb-3 relative flex items-center justify-center">
                    {/* Katalogda 1. seviye veya varsayılan resmi göster */}
                    <img src={bina.hasLevels ? `${bina.imageBase}1.png` : `${bina.imageBase}.png`} alt={bina.name} className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform drop-shadow-md" />
                  </div>
                  <span className="text-emerald-400 font-bold text-sm text-center">{bina.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* E. İNŞA EDİLMİŞ BİNA YÜKSELTME MENÜSÜ */}
      {activeMenu === 'plot_upgrade' && selectedPlotId && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm" onClick={closeMenu}>
          {(() => {
            const arsa = plots.find(p => p.id === selectedPlotId);
            if (!arsa || !arsa.building) return null;
            const bina = arsa.building;

            return (
              <div className="bg-slate-800 border-2 border-emerald-500 p-6 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.2)] max-w-sm w-full m-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-3">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">🏛️ {bina.name}</h2>
                  <button onClick={closeMenu} className="text-slate-400 hover:text-red-500 text-3xl font-black leading-none transition-colors">&times;</button>
                </div>
                <div className="text-center mb-6">
                  <img src={getBuildingImage(bina)} className="w-32 h-32 object-contain mx-auto mb-4 drop-shadow-xl" alt={bina.name} />
                  {bina.hasLevels && <p className="text-gray-300 text-sm">Şu anki seviye: <span className="font-bold text-emerald-400">Level {bina.currentLevel}</span></p>}
                </div>
                <div className="flex flex-col gap-3">
                  {bina.hasLevels && bina.currentLevel < bina.maxLevel && (
                    <button onClick={upgradePlotBuilding} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2">
                      <span>⬆️</span> Seviye Yükselt
                    </button>
                  )}
                  {bina.hasLevels && bina.currentLevel >= bina.maxLevel && (
                    <button disabled className="w-full bg-slate-700 text-gray-400 font-bold py-3 rounded-xl cursor-not-allowed border border-slate-600">
                      🌟 Maksimum Seviyeye Ulaşıldı
                    </button>
                  )}
                  <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2">
                    <span>➡️</span> İçeri Gir
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

    </div>
  );
}