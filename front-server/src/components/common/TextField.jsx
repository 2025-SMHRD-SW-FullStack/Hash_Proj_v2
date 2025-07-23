import React from 'react'
import styles from './TextField.module.css'

const TextField = ({ 
    label, 
    type = 'text', 
    id,
    value = '',
    mixLength,
    maxLength,
    onChange = () => {},
    required,
    isRequiredMark = false,
    inputRef,
    first, 
    last, 
    singleFirst,
    singleMiddle,
    singleMiddle2,
    singleLast,
    single,
    icon,
    children,
    ...rest
}) => {
    const className = [styles.field];
    if (first) className.push(styles.first);
    if (last) className.push(styles.last);
    if (singleFirst) className.push(styles.singleFirst);
    if (singleMiddle) className.push(styles.singleMiddle);
    if (singleMiddle2) className.push(styles.singleMiddle2);
    if (singleLast) className.push(styles.singleLast);
    if (single) className.push(styles.single);

    return (
        <div className={className.join(' ')}>
            {type === 'radio' ? (
                <div className={styles.radioGroup}>
                    <div 
                        className={`${styles.radioButton} ${value === '남자' ? styles.selected : ''}`}
                        onClick={() => onChange({target: { value: '남자' }})}
                    >
                        남자
                    </div>
                    <div 
                        className={`${styles.radioButton} ${value === '여자' ? styles.selected : ''}`}
                        onClick={() => onChange({target: { value: '여자' }})}
                    >
                        
                        여자
                    </div>
                </div>
            ) : (
                <>        
                    <input
                        type={type}
                        id={id}
                        value={value}
                        onChange={onChange}
                        ref={inputRef}
                        required={required}
                        placeholder=' '
                        // minLength={type === 'password' ? 8 : undefined}
                        maxLength={type === 'password' ? 30 : id === 'birth' ? 6 : undefined}
                        {...rest}
                    />
                    <label htmlFor={id}>
                        {isRequiredMark && <span className={styles.required}>*</span>}
                        {label}
                    </label>
                    {icon && <div className={styles.icon}>{icon}</div>}
                    {children && <div className={styles.custom}>{children}</div>}
                </>
            )}
        </div>
    )
}

export default TextField