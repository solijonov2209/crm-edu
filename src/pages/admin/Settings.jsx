import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Input, Select } from '../../components/common';
import { User, Lock, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = () => {
  const { t, i18n } = useTranslation();
  const { user, updateProfile, updatePassword } = useAuth();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const profileForm = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
    }
  });

  const passwordForm = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }
  });

  const handleProfileSubmit = async (data) => {
    setProfileLoading(true);
    await updateProfile(data);
    setProfileLoading(false);
  };

  const handlePasswordSubmit = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setPasswordLoading(true);
    const result = await updatePassword(data.currentPassword, data.newPassword);
    if (result.success) {
      passwordForm.reset();
    }
    setPasswordLoading(false);
  };

  const languages = [
    { value: 'uz', label: "O'zbek" },
    { value: 'ru', label: 'Русский' },
    { value: 'en', label: 'English' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="text-gray-500">{t('settings.profile')}</p>
      </div>

      {/* Profile Settings */}
      <Card>
        <Card.Header>
          <h3 className="font-semibold flex items-center gap-2">
            <User className="w-5 h-5 text-primary-500" />
            {t('settings.profile')}
          </h3>
        </Card.Header>
        <Card.Body>
          <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('players.firstName')}
                {...profileForm.register('firstName', { required: true })}
              />
              <Input
                label={t('players.lastName')}
                {...profileForm.register('lastName', { required: true })}
              />
            </div>
            <Input
              label={t('common.email')}
              value={user?.email}
              disabled
            />
            <Input
              label={t('common.phone')}
              {...profileForm.register('phone')}
            />
            <div className="flex justify-end">
              <Button type="submit" loading={profileLoading}>
                {t('common.save')}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>

      {/* Language Settings */}
      <Card>
        <Card.Header>
          <h3 className="font-semibold flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary-500" />
            {t('settings.language')}
          </h3>
        </Card.Header>
        <Card.Body>
          <Select
            options={languages}
            value={i18n.language}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            className="max-w-xs"
          />
        </Card.Body>
      </Card>

      {/* Password Settings */}
      <Card>
        <Card.Header>
          <h3 className="font-semibold flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary-500" />
            {t('settings.changePassword')}
          </h3>
        </Card.Header>
        <Card.Body>
          <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
            <Input
              label={t('settings.currentPassword')}
              type="password"
              {...passwordForm.register('currentPassword', { required: true })}
            />
            <Input
              label={t('settings.newPassword')}
              type="password"
              {...passwordForm.register('newPassword', {
                required: true,
                minLength: { value: 6, message: 'Min 6 characters' }
              })}
            />
            <Input
              label={t('settings.confirmPassword')}
              type="password"
              {...passwordForm.register('confirmPassword', { required: true })}
            />
            <div className="flex justify-end">
              <Button type="submit" loading={passwordLoading}>
                {t('settings.changePassword')}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default Settings;
