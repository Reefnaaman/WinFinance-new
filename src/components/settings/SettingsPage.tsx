'use client'

import React, { useState } from 'react';
import UserManagement from './UserManagement';
import EmailSettings from './EmailSettings';
import GmailConnect from './GmailConnect';
import { Agent } from '@/lib/database.types';

interface SettingsPageProps {
  dbAgents: Agent[];
  fetchData: () => Promise<void>;
}

export default function SettingsPage({ dbAgents, fetchData }: SettingsPageProps) {
  const [activeSettingsTab, setActiveSettingsTab] = useState('users');

  const settingsTabs = [
    { id: 'users', label: 'ניהול משתמשים', icon: '👥' },
    { id: 'gmail', label: 'חיבור Gmail', icon: '📨' },
    { id: 'email', label: 'הגדרות IMAP', icon: '📧' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in-scale animation-delay-100">
        <h2 className="text-2xl font-bold text-slate-800">הגדרות</h2>
      </div>

      {/* Settings Sub-tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 animate-fade-in-up animation-delay-200">
        <div className="border-b border-slate-200">
          <nav className="flex justify-start space-x-reverse space-x-8 px-6" dir="rtl">
            {settingsTabs.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setActiveSettingsTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap animate-fade-in-scale animation-delay-${300 + (index * 100)} ${
                  activeSettingsTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6 animate-fade-in-up animation-delay-400">
          {activeSettingsTab === 'users' && (
            <UserManagement dbAgents={dbAgents} fetchData={fetchData} />
          )}
          {activeSettingsTab === 'gmail' && <GmailConnect />}
          {activeSettingsTab === 'email' && <EmailSettings />}
        </div>
      </div>
    </div>
  );
}