import { generateInitials } from '../../utils/helpers';

const Avatar = ({
  src,
  firstName,
  lastName,
  size = 'default',
  className = '',
}) => {
  const sizes = {
    small: 'w-8 h-8 text-xs',
    default: 'w-10 h-10 text-sm',
    large: 'w-14 h-14 text-base',
    xlarge: 'w-20 h-20 text-xl',
  };

  if (src) {
    return (
      <img
        src={src}
        alt={`${firstName} ${lastName}`}
        className={`${sizes[size]} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full bg-primary-100 text-primary-700 font-medium flex items-center justify-center ${className}`}
    >
      {generateInitials(firstName, lastName)}
    </div>
  );
};

export default Avatar;
