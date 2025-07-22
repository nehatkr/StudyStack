import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Mail, Lock, User, Building, Globe, Phone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'viewer' | 'contributor';
  institution?: string;
  bio?: string;
  phone?: string;
  website?: string;
}

interface ForgotPasswordForm {
  email: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const { login, register, forgotPassword, isLoading } = useAuth();
  
  const loginForm = useForm<LoginForm>();
  const registerForm = useForm<RegisterForm>({
    defaultValues: { role: 'viewer' }
  });
  const forgotForm = useForm<ForgotPasswordForm>();

  const [showSuccess, setShowSuccess] = useState(false);

  const onLoginSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password, data.rememberMe);
      onClose();
    } catch (error) {
      loginForm.setError('email', { message: 'Invalid credentials' });
      console.log(error);
      
    }
  };

  const onRegisterSubmit = async (data: RegisterForm) => {
    if (data.password !== data.confirmPassword) {
      registerForm.setError('confirmPassword', { message: 'Passwords do not match' });
      return;
    }
    
    try {
      await register({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        institution: data.institution,
        bio: data.bio,
        contactInfo: {
          phone: data.phone,
          website: data.website,
        },
      });
      onClose();
    } catch (error) {
      registerForm.setError('email', { message: 'Registration failed' });
    }
  };

  const onForgotSubmit = async (data: ForgotPasswordForm) => {
    try {
      await forgotPassword(data.email);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setMode('login');
      }, 3000);
    } catch (error) {
      forgotForm.setError('email', { message: 'Failed to send reset email' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto relative">
        <div className="p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-background-200 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-secondary-500" />
          </button>

          <div className="text-center mb-6">
            <img 
              src="/ChatGPT Image Jul 15, 2025, 12_10_35 PM.png" 
              alt="StudyStack Logo" 
              className="w-16 h-16 mx-auto mb-4 rounded-lg object-cover"
            />
            <h2 className="text-2xl font-bold text-black mb-2">
              {mode === 'login' && 'Welcome Back'}
              {mode === 'register' && 'Join StudyStack'}
              {mode === 'forgot' && 'Reset Password'}
            </h2>
            <p className="text-secondary-500">
              {mode === 'login' && 'Sign in to access your resources'}
              {mode === 'register' && 'Create your account to get started'}
              {mode === 'forgot' && 'Enter your email to receive reset instructions'}
            </p>
          </div>

          {showSuccess && (
            <div className="mb-6 p-4 bg-success-50 border border-success-200 rounded-lg animate-slide-down">
              <p className="text-success-700 text-sm text-center">
                Password reset instructions sent to your email!
              </p>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              <Input
                type="email"
                placeholder="Email address"
                icon={<Mail className="h-4 w-4" />}
                {...loginForm.register('email', { required: 'Email is required' })}
                error={loginForm.formState.errors.email?.message}
              />
              <Input
                type="password"
                placeholder="Password"
                icon={<Lock className="h-4 w-4" />}
                {...loginForm.register('password', { required: 'Password is required' })}
                error={loginForm.formState.errors.password?.message}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...loginForm.register('rememberMe')}
                    className="mr-2 text-secondary-600 focus:ring-secondary-500"
                  />
                  <span className="text-sm text-secondary-600">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-sm text-secondary-600 hover:text-secondary-700 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Button type="submit" variant="primary" className="w-full" loading={isLoading}>
                Sign In
              </Button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
              <Input
                type="text"
                placeholder="Full name"
                icon={<User className="h-4 w-4" />}
                {...registerForm.register('name', { 
                  required: 'Name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' }
                })}
                error={registerForm.formState.errors.name?.message}
              />
              <Input
                type="email"
                placeholder="Professional email address"
                icon={<Mail className="h-4 w-4" />}
                {...registerForm.register('email', { required: 'Email is required' })}
                error={registerForm.formState.errors.email?.message}
                helperText="Use your institutional email for verification"
              />
              
              <div>
                <label className="block text-sm font-medium text-black mb-2">Account Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center p-3 border border-background-400 rounded-lg cursor-pointer hover:bg-background-100 transition-colors">
                    <input
                      type="radio"
                      value="viewer"
                      {...registerForm.register('role')}
                      className="mr-2 text-secondary-600 focus:ring-secondary-500"
                    />
                    <div>
                      <div className="font-medium text-sm">Student</div>
                      <div className="text-xs text-secondary-500">Access resources</div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border border-background-400 rounded-lg cursor-pointer hover:bg-background-100 transition-colors">
                    <input
                      type="radio"
                      value="contributor"
                      {...registerForm.register('role')}
                      className="mr-2 text-secondary-600 focus:ring-secondary-500"
                    />
                    <div>
                      <div className="font-medium text-sm">Educator</div>
                      <div className="text-xs text-secondary-500">Share resources</div>
                    </div>
                  </label>
                </div>
              </div>

              <Input
                type="text"
                placeholder="Institution/Organization"
                icon={<Building className="h-4 w-4" />}
                {...registerForm.register('institution')}
                error={registerForm.formState.errors.institution?.message}
              />

              {registerForm.watch('role') === 'contributor' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Bio/Credentials
                    </label>
                    <textarea
                      {...registerForm.register('bio')}
                      rows={3}
                      className="w-full px-3 py-2 bg-card-500 border border-background-400 rounded-lg text-black placeholder-secondary-400 focus:ring-2 focus:ring-secondary-500 focus:border-transparent resize-none transition-all duration-300"
                      placeholder="Brief description of your background and expertise..."
                    />
                  </div>
                  <Input
                    type="tel"
                    placeholder="Phone number (optional)"
                    icon={<Phone className="h-4 w-4" />}
                    {...registerForm.register('phone')}
                  />
                  <Input
                    type="url"
                    placeholder="Website (optional)"
                    icon={<Globe className="h-4 w-4" />}
                    {...registerForm.register('website')}
                  />
                </>
              )}

              <Input
                type="password"
                placeholder="Password"
                icon={<Lock className="h-4 w-4" />}
                {...registerForm.register('password', { 
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' }
                })}
                error={registerForm.formState.errors.password?.message}
              />
              <Input
                type="password"
                placeholder="Confirm password"
                icon={<Lock className="h-4 w-4" />}
                {...registerForm.register('confirmPassword', { required: 'Please confirm your password' })}
                error={registerForm.formState.errors.confirmPassword?.message}
              />
              <Button type="submit" variant="primary" className="w-full" loading={isLoading}>
                Create Account
              </Button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={forgotForm.handleSubmit(onForgotSubmit)} className="space-y-4">
              <Input
                type="email"
                placeholder="Email address"
                icon={<Mail className="h-4 w-4" />}
                {...forgotForm.register('email', { required: 'Email is required' })}
                error={forgotForm.formState.errors.email?.message}
                helperText="We'll send you instructions to reset your password"
              />
              <Button type="submit" variant="primary" className="w-full" loading={isLoading}>
                Send Reset Instructions
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            {mode === 'login' && (
              <button
                onClick={() => setMode('register')}
                className="text-sm text-secondary-600 hover:text-secondary-700 hover:underline"
              >
                Don't have an account? Sign up
              </button>
            )}
            {mode === 'register' && (
              <button
                onClick={() => setMode('login')}
                className="text-sm text-secondary-600 hover:text-secondary-700 hover:underline"
              >
                Already have an account? Sign in
              </button>
            )}
            {mode === 'forgot' && (
              <button
                onClick={() => setMode('login')}
                className="text-sm text-secondary-600 hover:text-secondary-700 hover:underline"
              >
                Back to sign in
              </button>
            )}
          </div>

          {mode === 'login' && (
            <div className="mt-4 p-3 bg-background-100 rounded-lg">
              <p className="text-xs text-secondary-600 text-center">
                <strong>Demo:</strong> Use any email/password. Add "contributor" in email for educator account.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};