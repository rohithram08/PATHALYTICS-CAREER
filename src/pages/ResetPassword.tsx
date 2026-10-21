import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * ResetPassword
 * Legacy Supabase route placeholder - redirects to the canonical
 * OTP-based password reset flow in ForgotPassword.tsx.
 */
const ResetPassword = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/forgot-password', { replace: true });
  }, [navigate]);

  return null;
};

export default ResetPassword;
