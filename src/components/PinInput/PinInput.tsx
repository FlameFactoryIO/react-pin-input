import React, {
  CSSProperties,
  forwardRef,
  HTMLAttributes,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import PinItem, { PinItemHandle } from "./PinItem";

interface Props {
  initialValue?: string | number;
  length: 4 | 6;
  type?: "numeric";
  onComplete?: (pin: string, currentIndex: number) => void;
  validate?: () => string;
  secret?: boolean;
  disabled?: boolean;
  focus?: boolean;
  onChange?: (pin: string, currentIndex: number) => void;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  style?: CSSProperties;
  inputStyle?: CSSProperties;
  inputFocusStyle?: CSSProperties;
  autoSelect?: boolean;
  regexCriteria?: RegExp;
  ariaLabel?: string;
  placeholder?: string;
  secretDelay?: number;
}

export type PinInputRef = {
  clear: () => void;
  focus: () => void;
};

const PinInput = forwardRef<PinInputRef, Props>(
  (
    {
      initialValue = "",
      length = 4,
      type = "numeric",
      onComplete,
      validate,
      secret = false,
      disabled,
      focus = false,
      onChange,
      inputMode,
      style,
      inputStyle,
      inputFocusStyle,
      autoSelect = true,
      regexCriteria = /^[a-zA-Z0-9]+$/,
      ariaLabel,
      placeholder,
      secretDelay = 0,
    },
    ref
  ) => {
    /**
     * We store the pin values in a ref so that updating them does not cause a re-render.
     * Each `PinItem` manages its own input value; this ref simply keeps track of the
     * concatenated string for the parent to call `onChange` and `onComplete`.
     */
    const valuesRef = useRef(
      Array(length)
        .fill("")
        .map((_, i) => initialValue.toString()[i] || "")
    );

    /**
     * We store refs to each `PinItem` (input) so we can:
     * - Focus the next/previous input
     * - Invoke child methods like `.clear()` or `.update()`
     */
    const elementsRef = useRef<PinItemHandle[]>([]);

    /**
     * On mount (and if `focus` is true), focus the first element.
     */
    useEffect(() => {
      if (focus && length) {
        elementsRef.current[0].focus();
      }
    }, [focus, length]);

    const clear = () => {
      // Calls each child's clear method
      elementsRef.current.forEach((el) => el?.clear());
      // Reset our tracking array
      valuesRef.current = valuesRef.current.map(() => "");
      // Re-focus the first item
      elementsRef.current[0]?.focus();
    };

    const focusFirstInput = () => {
      if (length > 0) {
        elementsRef.current[0]?.focus();
      }
    };

    /**
     * Called by each `PinItem` on change:
     * - Update valuesRef
     * - Optionally move focus to next input
     * - Call onChange/onComplete
     */
    const onItemChange = (value: string, isPasting: boolean, index: number) => {
      // Update the local reference array
      valuesRef.current[index] = value;
      let currentIndex = index;

      // Move focus to the next element if there's a single char
      if (value.length === 1 && index < length - 1) {
        currentIndex += 1;
        elementsRef.current[currentIndex]?.focus();
      }

      // Combine the pin
      const pin = valuesRef.current.join("");

      // onChange callback
      if (!isPasting) {
        onChange?.(pin, currentIndex);
      }

      // If the entire pin is filled, call onComplete
      if (pin.length === length) {
        // If pasting, only call onComplete from the last input
        if (isPasting && index < length - 1) {
          return;
        }
        onComplete?.(pin, currentIndex);
      }
    };

    const handleBackspace = (index: number) => {
      if (index > 0) {
        elementsRef.current[index - 1]?.focus();
      }
    };

    /**
     * Handling paste from the first input only
     */
    const handlePaste = (pastedValue: string) => {
      if (pastedValue.length !== length) {
        return;
      }
      // Update each child
      elementsRef.current.forEach((el, index) => {
        if (el && typeof el.update === "function") {
          el.update(pastedValue[index], true); // The child will call onItemChange internally
        }
      });
    };

    /**
     * Provide imperative methods if a parent needs to call `clear()` or `focus()`.
     */
    useImperativeHandle(ref, () => ({
      clear,
      focus: focusFirstInput,
    }));

    return (
      <div style={style}>
        {valuesRef.current.map((val, i) => (
          <PinItem
            key={i}
            initialValue={val}
            ref={(el: PinItemHandle) => {
              elementsRef.current[i] = el;
            }}
            disabled={disabled}
            secret={secret}
            onBackspace={() => handleBackspace(i)}
            onChange={(v: string, isPasting: boolean) =>
              onItemChange(v, isPasting, i)
            }
            type={type}
            inputMode={inputMode}
            validate={validate}
            style={inputStyle}
            focusedStyle={inputFocusStyle}
            autoSelect={autoSelect}
            onPaste={i === 0 ? handlePaste : undefined}
            regexCriteria={regexCriteria}
            ariaLabel={ariaLabel}
            placeholder={placeholder}
            secretDelay={secretDelay}
          />
        ))}
      </div>
    );
  }
);

PinInput.displayName = "PinInput";
export default PinInput;
