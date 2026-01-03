'use client'

import React, { useState, useEffect } from 'react';

export default function EmailSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showDetailedInstructions, setShowDetailedInstructions] = useState(false);
  const [formData, setFormData] = useState({
    email_host: 'imap.gmail.com',
    email_port: 993,
    email_username: '',
    email_password: '',
    email_secure: true,
    monitored_email_addresses: '',
    email_enabled: false
  });

  // Load email settings
  useEffect(() => {
    loadEmailSettings();
  }, []);

  const loadEmailSettings = async () => {
    try {
      const response = await fetch('/api/email-settings');
      const data = await response.json();

      if (data.success && data.settings) {
        setSettings(data.settings);
        setFormData({
          email_host: data.settings.email_host || 'imap.gmail.com',
          email_port: data.settings.email_port || 993,
          email_username: data.settings.email_username || '',
          email_password: data.settings.email_password || '',
          email_secure: data.settings.email_secure !== false,
          monitored_email_addresses: (data.settings.monitored_email_addresses || []).join(', '),
          email_enabled: data.settings.email_enabled || false
        });
      }
    } catch (error) {
      console.error('Error loading email settings:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/email-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          monitored_email_addresses: formData.monitored_email_addresses
            .split(',')
            .map(email => email.trim())
            .filter(email => email.length > 0)
        })
      });

      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
        alert('הגדרות נשמרו בהצלחה!');
      } else {
        alert('שגיאה בשמירת הגדרות');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('שגיאה בשמירת הגדרות');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch('/api/test-email-connection', {
        method: 'POST'
      });
      const data = await response.json();
      alert(data.message);
    } catch (error) {
      alert('שגיאה בבדיקת חיבור');
    } finally {
      setTesting(false);
    }
  };

  const checkEmails = async () => {
    setChecking(true);
    try {
      const response = await fetch('/api/check-emails', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        alert('בדיקת מיילים הושלמה!');
      } else {
        alert('שגיאה בבדיקת מיילים');
      }
    } catch (error) {
      alert('שגיאה בבדיקת מיילים');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white text-xl">
            📧
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">הגדרות אינטגרציית מייל</h3>
            <p className="text-slate-600 mb-4">
              קבע אינטגרציה אוטומטית עם חשבון המייל שלך לקליטת לידים חדשים ישירות מאימיילים נכנסים.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-amber-800 font-medium mb-2">
                <span>⚠️</span>
                <span>הוראות הגדרה חשובות</span>
              </div>
              <p className="text-amber-700 text-sm">
                לפני התחברות, יש להפעיל "אימות דו-שלבי" בחשבון Gmail ולייצר "סיסמת אפליקציה" ייעודית.
              </p>
              <button
                onClick={() => setShowDetailedInstructions(!showDetailedInstructions)}
                className="text-amber-600 hover:text-amber-800 text-sm font-medium mt-2 underline"
              >
                {showDetailedInstructions ? 'הסתר הוראות מפורטות' : 'הצג הוראות מפורטות'}
              </button>
            </div>

            {showDetailedInstructions && (
              <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 text-sm text-slate-700 space-y-2">
                <h4 className="font-semibold text-slate-900">שלבי הגדרה של חשבון Gmail:</h4>
                <ol className="list-decimal list-inside space-y-1 mr-4">
                  <li>היכנס לחשבון Google שלך → הגדרות אבטחה</li>
                  <li>הפעל "אימות דו-שלבי" אם עדיין לא הופעל</li>
                  <li>לחץ על "סיסמאות אפליקציות" → בחר "מייל" → בחר "מכשיר אחר"</li>
                  <li>הזן שם לאפליקציה (למשל: "WinFinance Leads")</li>
                  <li>העתק את הסיסמה שנוצרה והכנס אותה בשדה "סיסמה" למטה</li>
                </ol>
                <div className="bg-blue-50 p-3 rounded mt-3">
                  <p className="text-blue-700 text-xs">
                    <strong>חשוב:</strong> השתמש בכתובת המייל המלאה שלך ובסיסמת האפליקציה שנוצרה, לא בסיסמה הרגילה של Google.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <h4 className="font-medium text-slate-900">הפעל אינטגרציית מייל</h4>
              <p className="text-sm text-slate-600">קבל לידים חדשים אוטומטית מהמיילים שלך</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.email_enabled}
                onChange={(e) => setFormData(prev => ({ ...prev, email_enabled: e.target.checked }))}
                className="sr-only"
              />
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.email_enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}>
                <div className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.email_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </div>
            </label>
          </div>

          {/* Connection Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">שרת IMAP</label>
              <input
                type="text"
                value={formData.email_host}
                onChange={(e) => setFormData(prev => ({ ...prev, email_host: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="imap.gmail.com"
                disabled={!formData.email_enabled}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">פורט</label>
              <input
                type="number"
                value={formData.email_port}
                onChange={(e) => setFormData(prev => ({ ...prev, email_port: parseInt(e.target.value) || 993 }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!formData.email_enabled}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">שם משתמש (אימייל)</label>
              <input
                type="email"
                value={formData.email_username}
                onChange={(e) => setFormData(prev => ({ ...prev, email_username: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your-email@gmail.com"
                disabled={!formData.email_enabled}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">סיסמת אפליקציה</label>
              <input
                type="password"
                value={formData.email_password}
                onChange={(e) => setFormData(prev => ({ ...prev, email_password: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="הכנס סיסמת אפליקציה"
                disabled={!formData.email_enabled}
              />
            </div>
          </div>

          {/* Monitored Email Addresses */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">כתובות מייל מנוטרות</label>
            <textarea
              value={formData.monitored_email_addresses}
              onChange={(e) => setFormData(prev => ({ ...prev, monitored_email_addresses: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email1@example.com, email2@example.com"
              rows={3}
              disabled={!formData.email_enabled}
            />
            <p className="text-xs text-slate-500 mt-1">
              רשום כתובות מייל מופרדות בפסיקים. רק מיילים מכתובות אלה יעובדו כלידים.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={testConnection}
              disabled={testing || !formData.email_enabled}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {testing ? 'בודק חיבור...' : '🔗 בדוק חיבור'}
            </button>

            <button
              onClick={checkEmails}
              disabled={checking || !formData.email_enabled}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {checking ? 'בודק מיילים...' : '📨 בדוק מיילים חדשים'}
            </button>

            <button
              onClick={saveSettings}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'שומר...' : '💾 שמור הגדרות'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}