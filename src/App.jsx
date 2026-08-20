import React, { useState, useMemo, useRef } from 'react';
import { 
  FolderOpen, FileWarning, Copy, CheckCircle2, 
  Loader2, AlertCircle, FileText, X, SplitSquareHorizontal, 
  Sparkles, Layers, FileDigit, UploadCloud
} from 'lucide-react';
import * as Diff from 'diff';
import { scanFiles } from './scanner';

function App() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('names');
  const [scanStatus, setScanStatus] = useState({ message: '', current: 0, total: 0 });
  const fileInputRef = useRef(null);

  // Diff Modal State
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [diffText1, setDiffText1] = useState('');
  const [diffText2, setDiffText2] = useState('');
  const [diffFiles, setDiffFiles] = useState({ name1: '', name2: '' });

  const handleFolderSelect = async (e) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0) return;

    // Convert FileList to Array
    const filesArray = Array.from(filesList);

    setLoading(true);
    setError(null);
    setResults(null);
    setScanStatus({ message: 'กำลังเตรียมการอ่านไฟล์...', current: 0, total: 0 });

    try {
      const result = await scanFiles(filesArray, (current, total, message) => {
        setScanStatus({ current, total, message });
      });

      setResults(result);
      if (result.duplicateNames.length > 0) setActiveTab('names');
      else if (result.duplicateContents.length > 0) setActiveTab('contents');
      else if (result.similarContents && result.similarContents.length > 0) setActiveTab('similar');
      
    } catch (err) {
      console.error(err);
      setError('เกิดข้อผิดพลาดขณะสแกนโฟลเดอร์ อาจมีไฟล์ที่อ่านไม่ได้หรือเบราว์เซอร์หน่วยความจำเต็ม');
    } finally {
      setLoading(false);
      // Reset input so same folder can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCompare = (file1, file2) => {
    setDiffFiles({ name1: file1.name, name2: file2.name });
    setDiffText1(file1.text || "");
    setDiffText2(file2.text || "");
    setIsDiffModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans text-slate-800 selection:bg-blue-100 selection:text-blue-900 relative overflow-hidden flex flex-col">
      
      {/* --- Light Performance-Optimized Background --- */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-purple-200/40 rounded-full blur-[100px]"></div>
        <div className="absolute top-[20%] right-[-10%] w-[35vw] h-[35vw] bg-blue-200/40 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[45vw] h-[45vw] bg-cyan-100/40 rounded-full blur-[100px]"></div>
        <div className="absolute inset-0 bg-white/60"></div>
      </div>

      {/* --- Diff Modal --- */}
      {isDiffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-md transition-all duration-300">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-[90vw] h-[90vh] flex flex-col overflow-hidden ring-1 ring-white/50 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-8 py-5 border-b border-slate-200/60 bg-white/50 shrink-0">
              <div className="flex items-center space-x-4">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20 text-white">
                   <SplitSquareHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800 tracking-tight leading-none mb-1">เปรียบเทียบเอกสาร</h3>
                  <p className="text-sm text-slate-500 font-medium">มุมมองแบบบรรทัดต่อบรรทัด (Side-by-Side)</p>
                </div>
              </div>
              <button onClick={() => setIsDiffModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-slate-100/50 hover:bg-slate-200 cursor-pointer p-2.5 rounded-full transition-all active:scale-95">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Legend */}
            <div className="px-8 py-3 flex items-center space-x-6 text-sm font-medium bg-slate-50/80 shrink-0 border-b border-slate-200/60">
              <div className="flex items-center space-x-2.5 bg-yellow-100/80 px-4 py-1.5 rounded-full border border-yellow-300/50 shadow-sm">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                </div>
                <span className="text-yellow-800 font-semibold text-xs tracking-wide">ไฮไลต์สีเหลือง = เนื้อหาซ้ำกัน 100%</span>
              </div>
              <div className="text-slate-500 text-xs">
                ข้อความพื้นหลังสีเทา คือจุดที่มีความแตกต่างกัน
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden bg-white/80">
              <DiffViewer text1={diffText1} text2={diffText2} file1Name={diffFiles.name1} file2Name={diffFiles.name2} />
            </div>
          </div>
        </div>
      )}

      {/* --- Main Content --- */}
      <main className="relative z-10 flex-1 flex flex-col items-center pt-16 pb-20 px-4 sm:px-6 w-full max-w-7xl mx-auto">
        
        {/* Hero Header */}
        <div className="text-center mb-12 max-w-3xl">
          <div className="inline-flex items-center justify-center px-4 py-1.5 mb-6 rounded-full bg-white/60 border border-slate-200 shadow-sm backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-blue-500 mr-2" />
            <span className="text-xs font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent uppercase tracking-wider">Client-Side Engine (Cloud Ready)</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6">
            ค้นหาเอกสารซ้ำซ้อน<br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
              ทำงานจบในเครื่องของคุณ 100%
            </span>
          </h1>
        </div>

        {/* Upload Button Area */}
        <div className="w-full max-w-xl mb-16 animate-in slide-in-from-bottom-4 duration-700">
          <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-white ring-1 ring-slate-900/5 text-center flex flex-col items-center">
            
            <input 
              type="file" 
              webkitdirectory="true" 
              directory="true" 
              multiple 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFolderSelect}
            />

            <button 
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              disabled={loading}
              className="group relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-blue-300 rounded-3xl bg-blue-50/30 hover:bg-blue-50/80 hover:border-blue-500 transition-all cursor-pointer overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              {loading ? (
                <Loader2 className="w-12 h-12 text-blue-500 mb-4 animate-spin relative z-10" />
              ) : (
                <div className="p-4 bg-white shadow-sm rounded-full mb-4 relative z-10 group-hover:scale-110 transition-transform group-hover:shadow-blue-200">
                  <UploadCloud className="w-8 h-8 text-blue-600" strokeWidth={1.5} />
                </div>
              )}
              <h3 className="text-xl font-bold text-slate-800 relative z-10 mb-1">
                {loading ? 'กำลังประมวลผลไฟล์...' : 'คลิกเพื่อเลือกโฟลเดอร์ในเครื่อง'}
              </h3>
              <p className="text-sm text-slate-500 font-medium relative z-10">
                AI Partial Match จะถูกประมวลผลโดยอัตโนมัติ
              </p>
            </button>

            {/* --- Beautiful Progress Bar --- */}
            {loading && (
              <div className="w-full mt-8 animate-in fade-in slide-in-from-top-4 duration-500 text-left">
                <div className="flex justify-between items-end mb-2.5">
                  <span className="text-sm font-bold text-slate-700 truncate mr-4">{scanStatus.message}</span>
                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg shrink-0">
                    {scanStatus.total > 0 ? `${Math.round((scanStatus.current / scanStatus.total) * 100)}%` : '0%'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3.5 mb-1 overflow-hidden shadow-inner relative">
                  <div className="absolute inset-0 bg-white/20"></div>
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3.5 rounded-full transition-all duration-300 ease-out relative" 
                    style={{ width: `${scanStatus.total > 0 ? (scanStatus.current / scanStatus.total) * 100 : 5}%` }}
                  >
                    <div className="absolute top-0 bottom-0 left-0 right-0 overflow-hidden rounded-full">
                       <div className="w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress_1s_linear_infinite]"></div>
                    </div>
                  </div>
                </div>
                <style>{`
                  @keyframes progress {
                    0% { background-position: 1rem 0; }
                    100% { background-position: 0 0; }
                  }
                `}</style>
              </div>
            )}

            {error && (
              <div className="mt-6 w-full p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center animate-in fade-in">
                <AlertCircle className="h-5 w-5 text-red-500 mr-3 shrink-0" />
                <span className="text-red-700 text-sm font-bold">{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* --- Results Section --- */}
        {results && !loading && (
          <div className="w-full flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
              <StatCard icon={<Layers />} title="ไฟล์ทั้งหมดที่สแกน" value={results.totalFiles} unit="ไฟล์" color="blue" />
              <StatCard icon={<FileWarning />} title="ชื่อไฟล์ซ้ำกัน" value={results.duplicateNames.length} unit="กลุ่ม" color="amber" />
              <StatCard icon={<Copy />} title="ซ้ำกัน 100%" value={results.duplicateContents.length} unit="กลุ่ม" color="rose" />
              <StatCard icon={<FileDigit />} title="คล้ายคลึงกัน" value={results.similarContents ? results.similarContents.length : 0} unit="คู่" color="purple" />
            </div>

            {/* Content Area */}
            {(results.duplicateNames.length > 0 || results.duplicateContents.length > 0 || (results.similarContents && results.similarContents.length > 0)) ? (
              <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] shadow-sm border border-slate-200/60 p-2 sm:p-4">
                
                {/* Modern Tabs */}
                <div className="flex overflow-x-auto hide-scrollbar p-2 mb-4 bg-slate-100/50 rounded-2xl">
                  <div className="flex space-x-2 min-w-max">
                    <TabButton active={activeTab === 'names'} onClick={() => setActiveTab('names')} count={results.duplicateNames.length} color="amber">
                      ชื่อไฟล์ซ้ำ
                    </TabButton>
                    <TabButton active={activeTab === 'contents'} onClick={() => setActiveTab('contents')} count={results.duplicateContents.length} color="rose">
                      เนื้อหาซ้ำ 100%
                    </TabButton>
                    {results.similarContents && (
                      <TabButton active={activeTab === 'similar'} onClick={() => setActiveTab('similar')} count={results.similarContents.length} color="purple">
                        เนื้อหาคล้ายคลึง
                      </TabButton>
                    )}
                  </div>
                </div>

                {/* Tab Content Body */}
                <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 min-h-[400px]">
                  {activeTab === 'names' && <DuplicateList items={results.duplicateNames} type="name" />}
                  {activeTab === 'contents' && <DuplicateList items={results.duplicateContents} type="content" />}
                  {activeTab === 'similar' && <SimilarList items={results.similarContents || []} onCompare={handleCompare} />}
                </div>

              </div>
            ) : (
              <div className="w-full flex flex-col items-center justify-center py-20 bg-white/60 backdrop-blur-lg rounded-[2rem] border border-slate-200 border-dashed">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-400 blur-2xl opacity-20 rounded-full"></div>
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 relative z-10 border border-green-100 shadow-sm">
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">สะอาดสะอ้าน!</h3>
                <p className="text-slate-500 font-medium max-w-md text-center px-6">
                  ไม่พบไฟล์ที่ซ้ำซ้อนกันในโฟลเดอร์นี้ โฟลเดอร์ของคุณถูกจัดระเบียบไว้อย่างดีเยี่ยม
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* --- Helper Components --- */

function StatCard({ icon, title, value, unit, color }) {
  const colorStyles = {
    blue: 'from-blue-500/10 to-transparent text-blue-600 border-blue-100/50',
    amber: 'from-amber-500/10 to-transparent text-amber-500 border-amber-100/50',
    rose: 'from-rose-500/10 to-transparent text-rose-500 border-rose-100/50',
    purple: 'from-purple-500/10 to-transparent text-purple-600 border-purple-100/50',
  };

  const iconBg = {
    blue: 'bg-blue-100/50',
    amber: 'bg-amber-100/50',
    rose: 'bg-rose-100/50',
    purple: 'bg-purple-100/50',
  }

  return (
    <div className={`bg-white/80 backdrop-blur-lg p-6 rounded-3xl shadow-sm border ${colorStyles[color]} relative overflow-hidden group hover:-translate-y-1 hover:shadow-md transition-all duration-300`}>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${colorStyles[color]} opacity-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700`}></div>
      <div className="relative z-10 flex items-center space-x-4">
        <div className={`p-4 rounded-2xl ${iconBg[color]} ${colorStyles[color].split(' ')[1]}`}>
          {React.cloneElement(icon, { className: 'w-7 h-7', strokeWidth: 2 })}
        </div>
        <div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
          <div className="flex items-baseline space-x-1">
            <p className="text-3xl font-black text-slate-800 tracking-tight">{value.toLocaleString()}</p>
            <span className="text-xs font-bold text-slate-400">{unit}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, count, children, color }) {
  const activeStyles = {
    amber: 'bg-white text-amber-700 shadow-sm border-amber-100',
    rose: 'bg-white text-rose-700 shadow-sm border-rose-100',
    purple: 'bg-white text-purple-700 shadow-sm border-purple-100',
  };

  const badgeStyles = {
    amber: active ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-500',
    rose: active ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-500',
    purple: active ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-500',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center px-6 py-3.5 rounded-[1rem] text-sm font-bold transition-all duration-300 border ${
        active ? activeStyles[color] : 'bg-transparent border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
      }`}
    >
      {children}
      <span className={`ml-2.5 px-2.5 py-0.5 rounded-lg text-xs font-black transition-colors ${badgeStyles[color]}`}>
        {count}
      </span>
    </button>
  );
}

function DuplicateList({ items, type }) {
  if (items.length === 0) return null;

  return (
    <div className="p-2 sm:p-4 grid gap-4">
      {items.map((item, index) => (
        <div key={index} className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md hover:border-slate-200 transition-all group">
          <div className="flex items-start space-x-4">
            <div className={`mt-0.5 p-3 rounded-2xl shrink-0 ${type === 'name' ? 'bg-gradient-to-br from-amber-100 to-amber-50 text-amber-500' : 'bg-gradient-to-br from-rose-100 to-rose-50 text-rose-500'}`}>
              {type === 'name' ? <FileWarning className="h-6 w-6" /> : <Copy className="h-6 w-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-black text-slate-800 truncate mb-1">
                {type === 'name' ? item.name : `รหัสแฮช: ${item.hash.substring(0,16)}...`}
              </h4>
              <p className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest flex items-center">
                พบการซ้ำซ้อนใน {item.files.length} ตำแหน่ง
              </p>
              
              <div className="space-y-2.5 bg-slate-50/50 rounded-xl p-3 border border-slate-100/50">
                {item.files.map((file, fileIdx) => (
                  <div key={fileIdx} className="flex items-center bg-white px-4 py-3 rounded-xl border border-slate-100 shadow-sm group-hover:border-slate-200 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 mr-3 shrink-0">
                      {fileIdx + 1}
                    </div>
                    <span className="flex-1 text-sm text-slate-600 font-mono truncate mr-4" title={file.path}>{file.path}</span>
                    {type === 'name' && (
                      <span className="text-[11px] text-slate-500 font-bold bg-slate-100 px-2.5 py-1 rounded-lg shrink-0">
                        {(file.size / 1024).toFixed(2)} KB
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SimilarList({ items, onCompare }) {
  if (items.length === 0) return null;

  return (
    <div className="p-2 sm:p-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
      {items.map((item, index) => (
        <div key={index} className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md hover:border-slate-200 transition-all flex flex-col h-full group">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 text-purple-600">
                <FileText className="h-5 w-5" />
              </div>
              <span className="bg-purple-100 text-purple-700 text-xs font-black px-3 py-1.5 rounded-xl">
                คล้ายกัน {item.similarity}%
              </span>
            </div>
            <button 
              onClick={() => onCompare(item.files[0], item.files[1])}
              className="inline-flex items-center justify-center px-4 py-2 border-2 border-purple-100 text-xs font-bold rounded-xl text-purple-700 bg-white hover:bg-purple-50 hover:border-purple-200 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              เปรียบเทียบ
            </button>
          </div>
          
          <div className="flex-1 bg-slate-50/50 rounded-xl p-2 border border-slate-100/50 flex flex-col justify-center gap-2">
            {item.files.map((file, fileIdx) => (
              <div key={fileIdx} className="flex items-start bg-white px-4 py-3 rounded-xl border border-slate-100 shadow-sm group-hover:border-slate-200 transition-colors">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 mr-3 shrink-0 mt-0.5">
                  {fileIdx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-700 truncate" title={file.name}>{file.name}</div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono truncate" title={file.path}>{file.path}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DiffViewer({ text1, text2, file1Name, file2Name }) {
  const lines = useMemo(() => {
    const diff = Diff.diffLines(text1, text2);
    const leftLines = [];
    const rightLines = [];
    
    let leftLineNum = 1;
    let rightLineNum = 1;

    diff.forEach((part) => {
      const partLines = part.value.replace(/\n$/, '').split('\n');
      
      if (part.added) {
        partLines.forEach(l => {
          leftLines.push({ text: '', type: 'empty', num: '' });
          rightLines.push({ text: l, type: 'diff', num: rightLineNum++ });
        });
      } else if (part.removed) {
        partLines.forEach(l => {
          leftLines.push({ text: l, type: 'diff', num: leftLineNum++ });
          rightLines.push({ text: '', type: 'empty', num: '' });
        });
      } else {
        partLines.forEach(l => {
          leftLines.push({ text: l, type: 'match', num: leftLineNum++ });
          rightLines.push({ text: l, type: 'match', num: rightLineNum++ });
        });
      }
    });

    return { leftLines, rightLines };
  }, [text1, text2]);

  return (
    <div className="flex h-full bg-white text-[13px] font-mono leading-relaxed overflow-y-auto">
      {/* Left Pane */}
      <div className="w-1/2 flex flex-col border-r border-slate-200">
        <div className="bg-slate-50 text-slate-600 font-bold px-6 py-4 border-b border-slate-200 sticky top-0 z-10 flex items-center shadow-sm">
          <FileText className="w-4 h-4 mr-2.5 text-slate-400" /> 
          <span className="truncate">ไฟล์ที่ 1: {file1Name}</span>
        </div>
        <div className="flex flex-col pb-10 pt-2">
          {lines.leftLines.map((line, idx) => (
            <div key={idx} className={`flex min-h-[22px] group ${line.type === 'match' ? 'bg-yellow-50/50' : line.type === 'empty' ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}>
              <div className="w-12 shrink-0 border-r border-slate-100 text-right pr-3 text-slate-300 select-none flex items-center justify-end font-medium text-[11px] group-hover:text-slate-400">
                {line.num}
              </div>
              <div className={`pl-4 pr-3 py-0.5 break-words whitespace-pre-wrap flex-1 ${line.type === 'match' ? 'bg-yellow-100 text-yellow-900 font-medium' : 'text-slate-500'}`}>
                {line.text}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Right Pane */}
      <div className="w-1/2 flex flex-col">
        <div className="bg-slate-50 text-slate-600 font-bold px-6 py-4 border-b border-slate-200 sticky top-0 z-10 flex items-center shadow-sm">
          <FileText className="w-4 h-4 mr-2.5 text-slate-400" /> 
          <span className="truncate">ไฟล์ที่ 2: {file2Name}</span>
        </div>
        <div className="flex flex-col pb-10 pt-2">
          {lines.rightLines.map((line, idx) => (
            <div key={idx} className={`flex min-h-[22px] group ${line.type === 'match' ? 'bg-yellow-50/50' : line.type === 'empty' ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}>
              <div className="w-12 shrink-0 border-r border-slate-100 text-right pr-3 text-slate-300 select-none flex items-center justify-end font-medium text-[11px] group-hover:text-slate-400">
                {line.num}
              </div>
              <div className={`pl-4 pr-3 py-0.5 break-words whitespace-pre-wrap flex-1 ${line.type === 'match' ? 'bg-yellow-100 text-yellow-900 font-medium' : 'text-slate-500'}`}>
                {line.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
