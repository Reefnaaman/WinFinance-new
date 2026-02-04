'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Agent } from '@/lib/database.types';

interface UserManagementProps {
  dbAgents: Agent[];
  fetchData: () => Promise<void>;
}

export default function UserManagement({ dbAgents, fetchData }: UserManagementProps) {
  const [users, setUsers] = useState<Agent[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Agent | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: 'TempPassword123!',
    role: 'agent' as 'admin' | 'coordinator' | 'agent' | 'lead_supplier'
  });
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>({});

  // Load users
  useEffect(() => {
    setUsers(dbAgents);
  }, [dbAgents]);

  // Create user function
  const createUser = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      setUsers(prev => [...prev, result.user]);
      // Store the password for the new user
      setUserPasswords(prev => ({ ...prev, [result.user.id]: newUser.password }));
      setNewUser({ name: '', email: '', password: 'TempPassword123!', role: 'agent' });
      setShowCreateModal(false);
      fetchData(); // Refresh data
      alert(`משתמש נוצר בהצלחה!\nסיסמה: ${newUser.password}\nכדאי לשמור את הסיסמה לפני סגירת ההודעה.`);
    } catch (error) {
      console.error('Error creating user:', error);
      alert('שגיאה ביצירת משתמש: ' + error);
    }
  };

  // Update user function
  const updateUser = async (userId: string, updates: Partial<Agent>, newPassword?: string) => {
    // Prevent editing admin user (פלג)
    const userToUpdate = users.find(u => u.id === userId);
    if (userToUpdate?.name === 'פלג' && userToUpdate?.role === 'admin') {
      alert('לא ניתן לערוך את המשתמש הראשי');
      return;
    }

    try {
      // Update agent record
      const { error } = await (supabase
        .from('agents') as any)
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      // Update password if provided
      if (newPassword) {
        const response = await fetch(`/api/users/${userId}/password`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password: newPassword })
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to update password');
        }

        // Store the new password
        setUserPasswords(prev => ({ ...prev, [userId]: newPassword }));
      }

      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, ...updates } : user
      ));
      setEditingUser(null);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error updating user:', error);
      alert('שגיאה בעדכון משתמש');
    }
  };

  // Delete user function
  const deleteUser = async (userId: string) => {
    // Prevent deleting admin user (פלג)
    const userToDelete = users.find(u => u.id === userId);
    if (userToDelete?.name === 'פלג' && userToDelete?.role === 'admin') {
      alert('לא ניתן למחוק את המשתמש הראשי');
      return;
    }

    if (!confirm('האם אתה בטוח שברצונך למחוק משתמש זה?')) return;

    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.filter(user => user.id !== userId));
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('שגיאה במחיקת משתמש');
    }
  };

  const roleLabels = {
    admin: 'מנהל',
    coordinator: 'מתאם',
    agent: 'סוכן',
    lead_supplier: 'ספק לידים'
  };

  const roleColors = {
    admin: 'bg-purple-100 text-purple-800',
    coordinator: 'bg-blue-100 text-blue-800',
    agent: 'bg-green-100 text-green-800',
    lead_supplier: 'bg-orange-100 text-orange-800'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">ניהול משתמשים</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + הוסף משתמש
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-right py-4 px-5 text-sm font-semibold text-slate-600">שם</th>
                <th className="text-right py-4 px-5 text-sm font-semibold text-slate-600">אימייל</th>
                <th className="text-right py-4 px-5 text-sm font-semibold text-slate-600">סיסמה</th>
                <th className="text-right py-4 px-5 text-sm font-semibold text-slate-600">תפקיד</th>
                <th className="text-right py-4 px-5 text-sm font-semibold text-slate-600">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors`}>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center text-slate-600 font-medium">
                        {user.name.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <span className="text-slate-700">{user.email}</span>
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-700 font-mono text-sm">
                        {showPasswords[user.id] ? (userPasswords[user.id] || '••••••••') : '••••••••'}
                      </span>
                      <button
                        onClick={() => setShowPasswords(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                        className="p-1 text-slate-500 hover:text-slate-700 transition-colors"
                        title={showPasswords[user.id] ? 'הסתר סיסמה' : 'הצג סיסמה'}
                      >
                        {showPasswords[user.id] ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${roleColors[user.role as keyof typeof roleColors]}`}>
                      {roleLabels[user.role as keyof typeof roleLabels]}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2">
                      {/* Check if this is the admin user (פלג) */}
                      {user.name === 'פלג' && user.role === 'admin' ? (
                        // Show protected message for admin user
                        <span className="text-xs text-slate-500 italic">משתמש מוגן</span>
                      ) : (
                        // Show normal edit/delete buttons for other users
                        <>
                          <button
                            onClick={() => {
                              // Extra protection - double check before allowing edit
                              if (user.name === 'פלג' && user.role === 'admin') {
                                alert('לא ניתן לערוך את המשתמש הראשי');
                                return;
                              }
                              setEditingUser(user);
                            }}
                            className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          >
                            ערוך
                          </button>
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            מחק
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-900 mb-4">הוסף משתמש חדש</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">שם</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  placeholder="הכנס שם משתמש"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">אימייל</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  placeholder="user@winfinance.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">סיסמה</label>
                <div className="relative">
                  <input
                    type={showPasswords['new'] ? 'text' : 'password'}
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    placeholder="הכנס סיסמה"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showPasswords['new'] ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">הסיסמה תישמר ותוצג רק למנהלים</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">תפקיד</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                >
                  <option value="agent">סוכן</option>
                  <option value="coordinator">מתאם</option>
                  <option value="admin">מנהל</option>
                  <option value="lead_supplier">ספק לידים</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={createUser}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                צור משתמש
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setEditingUser(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-900 mb-4">ערוך משתמש</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">שם</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">אימייל</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, email: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">סיסמה חדשה (השאר ריק כדי לא לשנות)</label>
                <div className="relative">
                  <input
                    type={showPasswords[`edit-${editingUser.id}`] ? 'text' : 'password'}
                    value={userPasswords[`temp-${editingUser.id}`] || ''}
                    onChange={(e) => setUserPasswords(prev => ({ ...prev, [`temp-${editingUser.id}`]: e.target.value }))}
                    className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    placeholder="הכנס סיסמה חדשה"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, [`edit-${editingUser.id}`]: !prev[`edit-${editingUser.id}`] }))}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showPasswords[`edit-${editingUser.id}`] ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">הכנס סיסמה רק אם ברצונך לשנות אותה</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">תפקיד</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, role: e.target.value as any } : null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                >
                  <option value="agent">סוכן</option>
                  <option value="coordinator">מתאם</option>
                  <option value="admin">מנהל</option>
                  <option value="lead_supplier">ספק לידים</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  const tempPassword = userPasswords[`temp-${editingUser.id}`];
                  updateUser(editingUser.id, editingUser, tempPassword);
                  // Clean up temp password
                  setUserPasswords(prev => {
                    const newPasswords = { ...prev };
                    delete newPasswords[`temp-${editingUser.id}`];
                    return newPasswords;
                  });
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                עדכן
              </button>
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}