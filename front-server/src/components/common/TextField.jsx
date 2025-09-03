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
    required, // HTML  필수입력
    isRequiredMark = false, // label 앞 *
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
    
    // ⬇️ select 전용 props
    options,    // ✅ [{ value: '2020', label: '2020' }, ...] or ['2020','2021',...]
    placeholderOption = '선택',
    disabled,             // select/input 공통
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

    // options가 string 배열이면 {value,label} 형태로 정규화
    const normalizedOptions =
        Array.isArray(options)
        ? options.map((o) =>
            typeof o === 'string' || typeof o === 'number'
                ? { value: String(o), label: String(o) }
                : o
            )
        : [];

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
            ) : type === 'select' ? (
                <>        
                 {/* ✅ select 모드 */}
                <select
                    id={id}
                    value={value ?? ''}
                    onChange={onChange}
                    ref={inputRef}
                    required={required}
                    disabled={disabled}
                    className={styles.select}     // CSS에 추가 권장(아래 참고)
                    {...rest}
                >
                    {/* placeholder option */}
                    <option value="">{placeholderOption}</option>
                    {normalizedOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                    ))}
                </select>
                <label htmlFor={id}>
                    {isRequiredMark && <span className={styles.required}>*</span>}
                    {label}
                </label>
                {children && <div className={styles.custom}>{children}</div>}
                </>
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
    );
};

export default TextField