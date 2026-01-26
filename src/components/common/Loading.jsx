import { useTranslation } from 'react-i18next';

const Loading = ({ size = 'default', text = true }) => {
  const { t } = useTranslation();

  const sizeClasses = {
    small: 'w-5 h-5 border-2',
    default: 'w-8 h-8 border-4',
    large: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div
        className={`${sizeClasses[size]} border-primary-200 border-t-primary-600 rounded-full animate-spin`}
      />
      {text && (
        <p className="mt-4 text-sm text-gray-500">{t('common.loading')}</p>
      )}
    </div>
  );
};

export default Loading;
