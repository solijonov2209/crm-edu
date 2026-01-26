import { useTranslation } from 'react-i18next';
import { FolderOpen } from 'lucide-react';
import Button from './Button';

const EmptyState = ({
  icon: Icon = FolderOpen,
  title,
  description,
  action,
  actionLabel,
  actionIcon,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">
        {title || t('common.noData')}
      </h3>
      {description && (
        <p className="text-sm text-gray-500 mb-4 max-w-sm">{description}</p>
      )}
      {action && actionLabel && (
        <Button onClick={action} icon={actionIcon}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
