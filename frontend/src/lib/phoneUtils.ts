/**
 * Format phone number for display (US format)
 * @param phone - Raw phone number string
 * @returns Formatted phone number or original if invalid
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Handle different lengths
  if (cleaned.length === 10) {
    // (XXX) XXX-XXXX
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // +1 (XXX) XXX-XXXX
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 7) {
    // XXX-XXXX (local number)
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }
  
  // Return original if we can't format it
  return phone;
}

/**
 * Clean phone number for storage (remove formatting)
 * @param phone - Formatted phone number
 * @returns Clean phone number with only digits and + for international
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  
  // Add +1 prefix for US numbers if 10 digits
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  return cleaned;
}

/**
 * Validate phone number format
 * @param phone - Phone number to validate
 * @returns true if valid US phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  
  const cleaned = phone.replace(/\D/g, '');
  
  // Valid US phone numbers: 10 digits or 11 digits starting with 1
  return cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith('1'));
}

/**
 * Format phone number as user types (for input fields)
 * @param value - Current input value
 * @returns Formatted value with cursor position info
 */
export function formatPhoneInput(value: string): { formatted: string; cursorOffset: number } {
  const cleaned = value.replace(/\D/g, '');
  let formatted = '';
  let cursorOffset = 0;
  
  if (cleaned.length >= 6) {
    formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  } else if (cleaned.length >= 3) {
    formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  } else {
    formatted = cleaned;
  }
  
  return { formatted, cursorOffset };
}

/**
 * React hook for phone number input with real-time formatting
 */
import { useState, useCallback } from 'react';

export function usePhoneInput(initialValue: string = '') {
  const [value, setValue] = useState(formatPhoneNumber(initialValue));
  const [rawValue, setRawValue] = useState(cleanPhoneNumber(initialValue));
  
  const handleChange = useCallback((inputValue: string) => {
    const { formatted } = formatPhoneInput(inputValue);
    setValue(formatted);
    setRawValue(cleanPhoneNumber(formatted));
  }, []);
  
  const isValid = isValidPhoneNumber(value);
  
  return {
    value,
    rawValue, // Use this for API calls
    handleChange,
    isValid,
    reset: () => {
      setValue('');
      setRawValue('');
    }
  };
}