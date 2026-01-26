const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'badge-gray',
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
  };

  return (
    <span className={`${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
