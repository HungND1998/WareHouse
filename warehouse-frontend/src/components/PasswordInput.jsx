import { useState } from 'react';

/**
 * Reusable PasswordInput component with show/hide 👁 toggle button
 */
export default function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  required,
  minLength,
  style,
  autoComplete,
  ...props
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="password-input-wrap">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        style={style}
        {...props}
      />
      <button
        type="button"
        className="password-toggle-btn"
        onClick={() => setShow((s) => !s)}
        title={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        tabIndex={-1}
      >
        {show ? '🙈' : '👁'}
      </button>
    </div>
  );
}
