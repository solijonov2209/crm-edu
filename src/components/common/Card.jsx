const Card = ({ children, className = '', ...props }) => {
  return (
    <div className={`card ${className}`} {...props}>
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = '', action }) => {
  return (
    <div className={`card-header flex items-center justify-between ${className}`}>
      <div>{children}</div>
      {action && <div>{action}</div>}
    </div>
  );
};

const CardBody = ({ children, className = '' }) => {
  return <div className={`card-body ${className}`}>{children}</div>;
};

Card.Header = CardHeader;
Card.Body = CardBody;

export default Card;
