'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginModal from '@/components/auth/LoginModal';

interface UseRequireAuthOptions {
  feature?: string;
}

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const { feature = 'running calculators' } = options;
  const { isAuthenticated } = useAuth();
  const [showModal, setShowModal] = useState(false);

  const requireAuth = useCallback(
    (callback: () => void) => {
      if (isAuthenticated) {
        callback();
      } else {
        setShowModal(true);
      }
    },
    [isAuthenticated]
  );

  const loginModal = useMemo(
    () => (
      <LoginModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        feature={feature}
      />
    ),
    [showModal, feature]
  );

  return { requireAuth, LoginModal: loginModal };
}
