import { ref, computed, reactive } from 'vue'

// Types
export interface ValidationRule {
  (value: any): boolean | string
}

export interface FieldValidation {
  value: any
  rules: ValidationRule[]
  errorMessages: string[]
  valid: boolean
  touched: boolean
}

export interface FormValidation {
  [key: string]: FieldValidation
}

// Common validation rules
export const validationRules = {
  required:
    (message = 'این فیلد الزامی است'): ValidationRule =>
    (value: any) =>
      !!value || message,

  email:
    (message = 'ایمیل معتبر وارد کنید'): ValidationRule =>
    (value: string) => {
      if (!value) return true
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(value) || message
    },

  minLength:
    (min: number, message?: string): ValidationRule =>
    (value: string) => {
      if (!value) return true
      const msg = message || `حداقل ${min} کاراکتر وارد کنید`
      return value.length >= min || msg
    },

  maxLength:
    (max: number, message?: string): ValidationRule =>
    (value: string) => {
      if (!value) return true
      const msg = message || `حداکثر ${max} کاراکتر مجاز است`
      return value.length <= max || msg
    },

  numeric:
    (message = 'فقط عدد وارد کنید'): ValidationRule =>
    (value: any) => {
      if (!value) return true
      return !isNaN(Number(value)) || message
    },

  integer:
    (message = 'عدد صحیح وارد کنید'): ValidationRule =>
    (value: any) => {
      if (!value) return true
      return Number.isInteger(Number(value)) || message
    },

  min:
    (min: number, message?: string): ValidationRule =>
    (value: number) => {
      if (value === null || value === undefined) return true
      const msg = message || `مقدار باید حداقل ${min} باشد`
      return Number(value) >= min || msg
    },

  max:
    (max: number, message?: string): ValidationRule =>
    (value: number) => {
      if (value === null || value === undefined) return true
      const msg = message || `مقدار باید حداکثر ${max} باشد`
      return Number(value) <= max || msg
    },

  range:
    (min: number, max: number, message?: string): ValidationRule =>
    (value: number) => {
      if (value === null || value === undefined) return true
      const msg = message || `مقدار باید بین ${min} تا ${max} باشد`
      const num = Number(value)
      return (num >= min && num <= max) || msg
    },

  pattern:
    (regex: RegExp, message = 'فرمت وارد شده صحیح نیست'): ValidationRule =>
    (value: string) => {
      if (!value) return true
      return regex.test(value) || message
    },

  url:
    (message = 'آدرس معتبر وارد کنید'): ValidationRule =>
    (value: string) => {
      if (!value) return true
      try {
        new URL(value)
        return true
      } catch {
        return message
      }
    },

  phone:
    (message = 'شماره تلفن معتبر وارد کنید'): ValidationRule =>
    (value: string) => {
      if (!value) return true
      const phoneRegex = /^(\+98|0)?9\d{9}$/
      return phoneRegex.test(value.replace(/\s/g, '')) || message
    },

  coordinate:
    (type: 'lat' | 'lon', message?: string): ValidationRule =>
    (value: number) => {
      if (value === null || value === undefined) return true
      const num = Number(value)
      if (isNaN(num)) return 'مقدار معتبر وارد کنید'

      if (type === 'lat') {
        const msg = message || 'عرض جغرافیایی باید بین -90 تا 90 باشد'
        return (num >= -90 && num <= 90) || msg
      } else {
        const msg = message || 'طول جغرافیایی باید بین -180 تا 180 باشد'
        return (num >= -180 && num <= 180) || msg
      }
    },

  ip:
    (message = 'آدرس IP معتبر وارد کنید'): ValidationRule =>
    (value: string) => {
      if (!value) return true
      const ipRegex =
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
      return ipRegex.test(value) || message
    },

  port:
    (message = 'پورت باید بین 1 تا 65535 باشد'): ValidationRule =>
    (value: number) => {
      if (value === null || value === undefined) return true
      const num = Number(value)
      return (num >= 1 && num <= 65535) || message
    },

  callsign:
    (message = 'نام ندا معتبر وارد کنید'): ValidationRule =>
    (value: string) => {
      if (!value) return true
      // Callsign should be alphanumeric with possible hyphens and underscores
      const callsignRegex = /^[a-zA-Z0-9_-]+$/
      return callsignRegex.test(value) || message
    },

  sidc:
    (message = 'کد SIDC معتبر وارد کنید'): ValidationRule =>
    (value: string) => {
      if (!value) return true
      // SIDC should be 15 characters
      return value.length === 15 || message
    },
}

// Composable for form validation
export function useValidation() {
  const fields = reactive<FormValidation>({})
  const isValidating = ref(false)

  // Add a field to validation
  const addField = (name: string, initialValue: any = '', rules: ValidationRule[] = []) => {
    fields[name] = {
      value: initialValue,
      rules,
      errorMessages: [],
      valid: true,
      touched: false,
    }
  }

  // Remove a field from validation
  const removeField = (name: string) => {
    delete fields[name]
  }

  // Validate a single field
  const validateField = (name: string): boolean => {
    const field = fields[name]
    if (!field) return true

    field.touched = true
    field.errorMessages = []
    field.valid = true

    for (const rule of field.rules) {
      const result = rule(field.value)
      if (result !== true) {
        field.errorMessages.push(result as string)
        field.valid = false
      }
    }

    return field.valid
  }

  // Validate all fields
  const validateAll = (): boolean => {
    isValidating.value = true
    let allValid = true

    for (const fieldName in fields) {
      const fieldValid = validateField(fieldName)
      if (!fieldValid) {
        allValid = false
      }
    }

    isValidating.value = false
    return allValid
  }

  // Reset validation for a field
  const resetField = (name: string) => {
    const field = fields[name]
    if (field) {
      field.errorMessages = []
      field.valid = true
      field.touched = false
    }
  }

  // Reset all fields
  const resetAll = () => {
    for (const fieldName in fields) {
      resetField(fieldName)
    }
  }

  // Get field value
  const getValue = (name: string) => {
    return fields[name]?.value
  }

  // Set field value
  const setValue = (name: string, value: any) => {
    if (fields[name]) {
      fields[name].value = value
      // Auto-validate on change if field was touched
      if (fields[name].touched) {
        validateField(name)
      }
    }
  }

  // Get field errors
  const getErrors = (name: string): string[] => {
    return fields[name]?.errorMessages || []
  }

  // Check if field is valid
  const isFieldValid = (name: string): boolean => {
    return fields[name]?.valid ?? true
  }

  // Check if field is touched
  const isFieldTouched = (name: string): boolean => {
    return fields[name]?.touched ?? false
  }

  // Computed properties
  const isFormValid = computed(() => {
    return Object.values(fields).every(field => field.valid)
  })

  const hasErrors = computed(() => {
    return Object.values(fields).some(field => field.errorMessages.length > 0)
  })

  const touchedFields = computed(() => {
    return Object.values(fields).filter(field => field.touched)
  })

  const formData = computed(() => {
    const data: Record<string, any> = {}
    for (const [name, field] of Object.entries(fields)) {
      data[name] = field.value
    }
    return data
  })

  return {
    // State
    fields,
    isValidating,

    // Methods
    addField,
    removeField,
    validateField,
    validateAll,
    resetField,
    resetAll,
    getValue,
    setValue,
    getErrors,
    isFieldValid,
    isFieldTouched,

    // Computed
    isFormValid,
    hasErrors,
    touchedFields,
    formData,
  }
}

// Composable for async validation
export function useAsyncValidation() {
  const pendingValidations = ref<Set<string>>(new Set())

  const validateAsync = async (
    fieldName: string,
    value: any,
    validator: (value: any) => Promise<boolean | string>
  ): Promise<boolean | string> => {
    pendingValidations.value.add(fieldName)

    try {
      const result = await validator(value)
      return result
    } finally {
      pendingValidations.value.delete(fieldName)
    }
  }

  const isValidating = (fieldName: string): boolean => {
    return pendingValidations.value.has(fieldName)
  }

  const isAnyValidating = computed(() => {
    return pendingValidations.value.size > 0
  })

  return {
    validateAsync,
    isValidating,
    isAnyValidating,
    pendingValidations: computed(() => Array.from(pendingValidations.value)),
  }
}

// Debounced validation
export function useDebouncedValidation(delay = 300) {
  const timeouts = new Map<string, NodeJS.Timeout>()

  const debouncedValidate = (fieldName: string, validator: () => void) => {
    // Clear existing timeout
    const existingTimeout = timeouts.get(fieldName)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      validator()
      timeouts.delete(fieldName)
    }, delay)

    timeouts.set(fieldName, timeout)
  }

  const clearDebounce = (fieldName: string) => {
    const timeout = timeouts.get(fieldName)
    if (timeout) {
      clearTimeout(timeout)
      timeouts.delete(fieldName)
    }
  }

  const clearAllDebounces = () => {
    timeouts.forEach(timeout => clearTimeout(timeout))
    timeouts.clear()
  }

  return {
    debouncedValidate,
    clearDebounce,
    clearAllDebounces,
  }
}
