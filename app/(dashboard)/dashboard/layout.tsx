"use client";

import { usePasswordChange } from './clients/hooks/usePasswordChange';
import { ChangePasswordModal } from './clients/components/ChangePasswordModal';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { showPasswordModal, setShowPasswordModal } = usePasswordChange();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen">
      <main className="flex-1">
        {children}
      </main>
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
} 