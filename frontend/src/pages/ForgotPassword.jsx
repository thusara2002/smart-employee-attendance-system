import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { FiMail, FiUser, FiArrowLeft } from 'react-icons/fi';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const { error, success } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) {
            error('Please enter your email address');
            return;
        }

        setLoading(true);
        try {
            await authAPI.forgotPassword(email);
            success('Password reset link has been sent to your email');
        } catch (err) {
            error(err.response?.data?.error || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="animated-bg"></div>

            <div className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <div className="logo-icon">
                            <FiUser />
                        </div>
                        <h1 className="login-title">Forgot Password</h1>
                        <p className="login-subtitle">Enter your email to receive a reset link</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <div className="input-wrapper">
                                <FiMail className="input-icon" />
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg login-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner" style={{ width: 20, height: 20 }}></span>
                                    Sending...
                                </>
                            ) : (
                                'Send Reset Link'
                            )}
                        </button>
                    </form>

                    <div className="login-footer">
                        <Link to="/login" className="back-link">
                            <FiArrowLeft /> Back to Login
                        </Link>
                    </div>
                </div>
            </div>

            <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .login-container {
          width: 100%;
          max-width: 440px;
        }

        .login-card {
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-xl);
          padding: 2.5rem;
          box-shadow: var(--shadow-xl);
        }

        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .login-header .logo-icon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          color: white;
          margin: 0 auto 1.5rem;
          box-shadow: var(--shadow-lg);
        }

        .login-title {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .login-subtitle {
          color: var(--text-secondary);
        }

        .login-form {
          margin-bottom: 1.5rem;
        }

        .input-wrapper {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .input-wrapper .form-input {
          padding-left: 2.75rem;
          padding-right: 2.75rem;
        }

        .login-btn {
          width: 100%;
          margin-top: 0.5rem;
        }

        .login-footer {
          text-align: center;
          color: var(--text-secondary);
          font-size: 0.875rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border);
        }

        .back-link {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: var(--primary);
          font-weight: 500;
          text-decoration: none;
        }

        .back-link:hover {
          text-decoration: underline;
        }
      `}</style>
        </div>
    );
}
