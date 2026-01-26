import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'danger',
  loading = false,
}) => {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="small">
      <div className="flex flex-col items-center text-center">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
          variant === 'danger' ? 'bg-red-100' : 'bg-yellow-100'
        }`}>
          <AlertTriangle className={`w-6 h-6 ${
            variant === 'danger' ? 'text-red-600' : 'text-yellow-600'
          }`} />
        </div>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 w-full">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            {cancelText || t('common.cancel')}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            className="flex-1"
            loading={loading}
          >
            {confirmText || t('common.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
