import React from 'react';

const EmptyState = ({ icon: Icon, title, description, actionButton }) => {
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1.5rem',
      textAlign: 'center',
      animation: 'fadeIn 0.5s ease-out'
    },
    iconWrapper: {
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      backgroundColor: 'var(--color-primary-light)',
      color: 'var(--color-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '1.5rem'
    },
    title: {
      fontSize: '1.25rem',
      fontWeight: '700',
      color: 'var(--color-text)',
      margin: '0 0 0.5rem 0'
    },
    description: {
      fontSize: '0.9rem',
      color: '#777',
      maxWidth: '400px',
      margin: '0 0 1.5rem 0',
      lineHeight: '1.6'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.iconWrapper}>
        <Icon size={40} />
      </div>
      <h3 style={styles.title}>{title}</h3>
      <p style={styles.description}>{description}</p>
      {actionButton && <div>{actionButton}</div>}
    </div>
  );
};

export default EmptyState;
