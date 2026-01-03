'use client'

import React, { useState } from 'react';
import { createPortal } from 'react-dom';

interface ImportResult {
  success: boolean;
  imported?: number;
  total?: number;
  duplicates?: number;
  errors?: string[];
  error?: string;
  details?: string;
}

interface CSVImportProps {
  onImportComplete: () => void;
}

export default function CSVImport({ onImportComplete }: CSVImportProps) {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setResult(null);
    } else {
      alert('אנא בחר קובץ CSV');
    }
  };

  const handleDebug = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import-csv', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      setResult({
        success: false,
        error: 'Debug Information',
        details: JSON.stringify(data, null, 2)
      });
    } catch (error) {
      setResult({
        success: false,
        error: 'שגיאה בניפוי הקובץ'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDetectHeaders = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/detect-csv-headers', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      // Format the results nicely
      const colorAnalysis = data.colorAnalysis?.hasColorCoding ? `

🎨 ניתוח צבעים:
${Object.entries(data.colorAnalysis.colorCounts).map(([color, count]: [string, any]) =>
  `• ${color}: ${count} שורות`
).join('\n')}
📊 סה"כ שורות צבועות: ${data.colorAnalysis.totalColoredRows}
      ` : '';

      const formattedInfo = `
📊 ניתוח כותרות CSV:

🔍 סה"כ שורות: ${data.totalLines}
📝 שורת כותרות: ${data.headerLine}

📋 עמודות שזוהו:
${data.columns.map((col: any) =>
  `${col.index}: "${col.header}" → ${col.type} (דוגמה: "${col.sample}"))`
).join('\n')}

🎯 מיפוי מומלץ:
• טלפון: עמודה ${data.recommendations.phoneColumn}
• סטטוס: עמודה ${data.recommendations.statusColumn}
• שם לקוח: עמודה ${data.recommendations.customerColumn}
• סוכן מטפל: עמודה ${data.recommendations.agentColumn}
• תאריך פגישה: עמודה ${data.recommendations.meetingColumn}
• קוד צבע: עמודה ${data.recommendations.colorColumn}
${colorAnalysis}
✅ שדות נדרשים זמינים: ${data.hasRequired ? 'כן' : 'לא'}
      `.trim();

      setResult({
        success: data.hasRequired,
        error: data.hasRequired ? 'ניתוח כותרות הושלם' : 'חסרים שדות נדרשים',
        details: formattedInfo
      });
    } catch (error) {
      setResult({
        success: false,
        error: 'שגיאה בניתוח כותרות'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import-csv', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        setTimeout(() => {
          onImportComplete();
          setFile(null);
          setResult(null);
        }, 3000);
      }
    } catch (error) {
      setResult({
        success: false,
        error: 'שגיאה בהעלאת הקובץ'
      });
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    onImportComplete();
    setFile(null);
    setResult(null);
  };

  // Don't render portal on server side
  if (typeof window === 'undefined' && isModalOpen) return null;

  return (
    <>
      {/* Import Modal - Using Portal to render outside of parent containers */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000]" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4 border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  ייבוא נתונים מ-CSV
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Instructions */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-blue-900">הנחיות לייבוא</h3>
                </div>
                <div className="space-y-2 text-sm text-blue-800">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>העמודות הנדרשות: נייד, סטטוס, תאריך פגישה, שם לקוח, סוכן מטפל</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>פורמט תאריך: DD.MM.YY או DD.MM.YYYY</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>שמות הסוכנים: עדי בראל, יקיר, דור, עידן, פלג</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>לשמירת צבעים: הוסף עמודת "צבע" עם הערכים: ירוק, אדום, צהוב, כחול</span>
                  </div>
                </div>
              </div>

              {/* Modern File Upload */}
              <div>
                <label htmlFor="file-upload" className="block text-sm font-semibold text-slate-700 mb-3">
                  העלאת קובץ
                </label>
                <div className="relative">
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                  <label
                    htmlFor="file-upload"
                    className={`
                      block w-full px-6 py-12 border-2 border-dashed rounded-xl cursor-pointer
                      transition-all duration-200 group
                      ${file
                        ? 'border-green-300 bg-green-50 hover:bg-green-100'
                        : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'
                      }
                    `}
                  >
                    <div className="text-center">
                      {file ? (
                        <>
                          <div className="w-12 h-12 mx-auto mb-3 bg-green-500 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <p className="text-sm font-semibold text-green-700">
                            {file.name}
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            {(file.size / 1024).toFixed(1)} KB • לחץ לשינוי הקובץ
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 mx-auto mb-3 bg-slate-200 group-hover:bg-blue-200 rounded-full flex items-center justify-center transition-colors">
                            <svg className="w-6 h-6 text-slate-500 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-slate-700 group-hover:text-blue-700">
                            לחץ להעלאת קובץ CSV
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            או גרור ושחרר את הקובץ כאן
                          </p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Import Result */}
              {result && (
                <div className={`p-4 rounded-lg ${
                  result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  {result.success ? (
                    <div>
                      <p className="text-green-600 font-medium mb-2">✅ הייבוא הושלם בהצלחה!</p>
                      <p className="text-sm text-green-700">
                        יובאו {result.imported} לידים חדשים מתוך {result.total}
                        {result.duplicates && result.duplicates > 0 && (
                          <span className="text-amber-700"> ({result.duplicates} כבר קיימים)</span>
                        )}
                      </p>
                      {result.errors && result.errors.length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-green-600 cursor-pointer">
                            {result.errors.length} שגיאות קלות
                          </summary>
                          <div className="mt-1 text-xs text-green-600 max-h-20 overflow-y-auto">
                            {result.errors.map((error, i) => (
                              <div key={i}>{error}</div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-red-600 font-medium mb-2">❌ שגיאה בייבוא</p>
                      <p className="text-sm text-red-700">{result.error}</p>
                      {result.details && (
                        <p className="text-xs text-red-600 mt-1">{result.details}</p>
                      )}
                      {result.errors && result.errors.length > 0 && (
                        <div className="mt-2 text-xs text-red-600 max-h-20 overflow-y-auto">
                          {result.errors.map((error, i) => (
                            <div key={i}>{error}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleDetectHeaders}
                  disabled={!file || loading}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed font-medium text-sm shadow-sm hover:shadow-md transition-all"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    זהה כותרות
                  </span>
                </button>
                <button
                  onClick={handleDebug}
                  disabled={!file || loading}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-xl hover:from-amber-600 hover:to-yellow-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed font-medium text-sm shadow-sm hover:shadow-md transition-all"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    בדוק נתונים
                  </span>
                </button>
                <button
                  onClick={handleImport}
                  disabled={!file || loading}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed font-medium shadow-sm hover:shadow-md transition-all"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      מייבא...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      ייבא נתונים
                    </span>
                  )}
                </button>
                <button
                  onClick={closeModal}
                  className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-300 font-medium transition-all"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}