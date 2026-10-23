'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginModal from '@/components/auth/LoginModal';
import { track } from '@/lib/track';

interface UseRequireAuthOptions {
  feature?: string;
  /** For /admin/stats: the tool and which part of it, e.g. ['calculators', 'pace']. Sign-in walls are counted too. */
  tool?: [label: string, detail: string];
}

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const { feature = 'running calculators', tool } = options;
  const [toolLabel, toolDetail] = tool ?? [];
  const { isAuthenticated } = useAuth();
  const [showModal, setShowModal] = useState(false);

  const requireAuth = useCallback(
    (callback: () => void) => {
      if (toolLabel) track('tool', toolLabel, isAuthenticated ? toolDetail! : `${toolDetail} (sign-in asked)`);
      if (isAuthenticated) {
        callback();
      } else {
        setShowModal(true);
      }
    },
    [isAuthenticated, toolLabel, toolDetail]
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
