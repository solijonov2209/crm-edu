import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { Trophy, Eye, EyeOff, Globe } from 'lucide-react';
import { Button, Input } from '../../components/common';

const Login = () => {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      password: '',
    }
  });

  const onSubmit = async (data) => {
    setLoading(true);
    await login(data.email, data.password);
    setLoading(false);
  };

  const languages = [
    { code: 'uz', name: "O'zbek", flag: '🇺🇿' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
  ];

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Language selector */}
          <div className="flex justify-end mb-8">
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <Globe className="w-4 h-4" />
                <span>{currentLang.flag} {currentLang.name}</span>
              </button>

              {langMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setLangMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-100 z-20 py-1">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          i18n.changeLanguage(lang.code);
                          setLangMenuOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 ${
                          i18n.language === lang.code ? 'text-primary-600 bg-primary-50' : 'text-gray-700'
                        }`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center">
              <Trophy className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Youth Football Academy</h1>
              <p className="text-sm text-gray-500">CRM System</p>
            </div>
          </div>

          {/* Form */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('auth.loginTitle')}
            </h2>
            <p className="text-gray-500">
              {t('auth.loginSubtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label={t('common.email')}
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              error={errors.email?.message}
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
            />

            <div className="relative">
              <Input
                label={t('common.password')}
                type={showPassword ? 'text' : 'password'}
                placeholder={t('auth.passwordPlaceholder')}
                error={errors.password?.message}
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters'
                  }
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="large"
              loading={loading}
            >
              {t('auth.login')}
            </Button>
          </form>

          {/* Demo credentials */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-2">Demo credentials:</p>
            <p className="text-xs text-gray-600">Admin: admin@academy.com / Admin123!</p>
            <p className="text-xs text-gray-600">Coach: coach1@academy.com / Coach123!</p>
          </div>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary-600 to-primary-800 items-center justify-center p-12">
        <div className="max-w-lg text-center text-white">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-white/10 flex items-center justify-center">
            <Trophy className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold mb-4">
            Manage Your Academy Like a Pro
          </h2>
          <p className="text-primary-100 text-lg">
            Track players, manage trainings, plan matches, and analyze performance - all in one place.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold">500+</div>
              <div className="text-sm text-primary-200">Players</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">50+</div>
              <div className="text-sm text-primary-200">Teams</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">100+</div>
              <div className="text-sm text-primary-200">Matches</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
