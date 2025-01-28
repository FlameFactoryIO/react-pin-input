import React, {
  ChangeEventHandler,
  ClipboardEventHandler,
  CSSProperties,
  FocusEventHandler,
  forwardRef,
  HTMLAttributes,
  KeyboardEventHandler,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

interface Props {
  initialValue?: string;
  onChange: (v: string, isPasting: boolean) => void;
  onBackspace: () => void;
  onPaste?: (v: string) => void;
  secret?: boolean;
  secretDelay?: number;
  disabled?: boolean;
  type?: "numeric";
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  validate?: (value: string) => string;
  // Style-related
  style?: CSSProperties;
  focusedStyle?: CSSProperties;
  // Additional
  autoSelect: boolean;
  regexCriteria?: RegExp;
  ariaLabel?: string;
  placeholder?: string;
}

export interface PinItemHandle {
  clear: () => void;
  focus: () => void;
  update: (v: string, isPasting: boolean) => void;
}

const PinItem = forwardRef<PinItemHandle, Props>(
  (
    {
      initialValue = "",
      secret = false,
      secretDelay = 0,
      onBackspace,
      onChange,
      onPaste,
      disabled = false,
      type = "numeric",
      inputMode,
      validate,
      style,
      focusedStyle,
      autoSelect = false,
      regexCriteria = /^[a-zA-Z0-9]+$/,
      ariaLabel,
      placeholder,
    },
    ref
  ) => {
    /**
     * Validate the input based on props.type, props.regexCriteria, or user-defined props.validate.
     * Also triggers the "secret delay" logic (show typed char briefly, then hide).
     */
    const validateValue = (rawValue: string) => {
      // Secret delay logic: temporarily show typed char, then hide it
      if (secretDelay) {
        setSecretDelayed(rawValue);
      }

      if (validate) {
        return validate(rawValue);
      }

      // Numeric type check
      if (type === "numeric") {
        if (!rawValue) return "";
        const numCode = rawValue.charCodeAt(0);
        const isDigit = numCode >= 48 && numCode <= 57; // '0'-'9'
        return isDigit ? rawValue : "";
      }

      // Regex check
      if (regexCriteria?.test(rawValue)) {
        return rawValue.toUpperCase();
      }

      return "";
    };

    // Local state
    const [value, setValue] = useState(() => validateValue(initialValue));
    const [showSecret, setShowSecret] = useState(secret);
    const [focus, setFocus] = useState(false);

    // References to manage timeouts and the input element
    const secretTimeoutRef = useRef<number>(null);
    const inputTimeoutRef = useRef<number>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    /**
     * Cleanup timeouts when unmounting (similar to componentWillUnmount).
     */
    useEffect(() => {
      return () => {
        if (secretTimeoutRef.current) clearTimeout(secretTimeoutRef.current);
        if (inputTimeoutRef.current) clearTimeout(inputTimeoutRef.current);
      };
    }, []);

    /**
     * Clears the value in this PinItem.
     */
    const clear = () => {
      setValue("");
    };

    /**
     * Focuses the underlying input element.
     */
    const focusInput = () => {
      inputRef.current?.focus();
    };

    const update = (updatedValue: string, isPasting = false) => {
      const validated = validateValue(updatedValue);
      // If the new validated value is the same and this isn't a paste, do nothing
      if (validated === value && !isPasting) return;

      if (validated.length < 2) {
        setValue(validated);

        // Defer the onChange call slightly to match the original class behavior
        inputTimeoutRef.current = setTimeout(() => {
          onChange(validated, isPasting);
        }, 0);
      }
    };

    /**
     * Because the parent calls these methods on the ref,
     * we expose them via `useImperativeHandle`.
     */
    useImperativeHandle(ref, () => ({
      clear,
      focus: focusInput,
      update,
    }));

    /**
     * Handler for user typing into the input.
     */
    const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
      update(e.target.value);
    };

    /**
     * Handler for backspace. If the field is empty, call onBackspace.
     */
    const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
      // keyCode 8 = Backspace
      if (e.keyCode === 8 && (!value || !value.length)) {
        onBackspace();
      }
    };

    /**
     * If autoSelect is enabled, highlight the existing value on focus.
     */
    const handleFocus: FocusEventHandler<HTMLInputElement> = (e) => {
      if (autoSelect) {
        e.target.select();
      }
      setFocus(true);
    };

    const handleBlur = () => {
      setFocus(false);
    };

    /**
     * If this PinItem is the first input in the parent, `onPaste` is provided.
     */
    const handlePaste: ClipboardEventHandler<HTMLInputElement> = (e) => {
      if (!onPaste) return;
      const pastedValue = e.clipboardData.getData("text");
      onPaste(pastedValue);
    };

    /**
     * setSecretDelayed:
     * 1) Immediately show typed character by setting showSecret = false
     * 2) After `secretDelay` ms, re-hide it (showSecret = true) if the input is not empty
     */
    const setSecretDelayed = (val: string) => {
      // Show typed char
      setShowSecret(false);

      // Re-hide after secretDelay ms (if there's a value)
      if (secretTimeoutRef.current) {
        clearTimeout(secretTimeoutRef.current);
      }
      secretTimeoutRef.current = setTimeout(() => {
        setShowSecret(Boolean(val));
      }, secretDelay);
    };

    /**
     * Render
     */
    const inputType = (type === "numeric" ? "tel" : type) || "text";
    return (
      <input
        ref={inputRef}
        disabled={disabled ? true : undefined}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || value}
        aria-label={ariaLabel || value}
        maxLength={1}
        autoComplete="off"
        type={showSecret ? "password" : inputType}
        inputMode={inputMode}
        pattern={type === "numeric" ? "[0-9]*" : "^[a-zA-Z0-9]+$"}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPaste={handlePaste}
        style={{
          padding: 0,
          margin: "0 2px",
          textAlign: "center",
          border: "none",
          background: "transparent",
          width: "50px",
          height: "50px",
          fontWeight: 600,

          ...style,

          ...(focus
            ? {
                outline: "none",
                boxShadow: "none",
                ...focusedStyle,
              }
            : {}),
        }}
        value={value}
      />
    );
  }
);

PinItem.displayName = "PinItem";
export default PinItem;
