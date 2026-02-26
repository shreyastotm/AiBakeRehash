import React from 'react'
import {
  useForm,
  FormProvider,
  UseFormReturn,
  FieldValues,
  DefaultValues,
  SubmitHandler,
  UseFormProps,
} from 'react-hook-form'

interface FormProps<T extends FieldValues> {
  onSubmit: SubmitHandler<T>
  children: React.ReactNode | ((methods: UseFormReturn<T>) => React.ReactNode)
  defaultValues?: DefaultValues<T>
  className?: string
  formOptions?: Omit<UseFormProps<T>, 'defaultValues'>
}

/**
 * Form component wrapping react-hook-form's FormProvider.
 * Provides form context to all child FormField components.
 */
export function Form<T extends FieldValues>({
  onSubmit,
  children,
  defaultValues,
  className = '',
  formOptions,
}: FormProps<T>) {
  const methods = useForm<T>({ defaultValues, ...formOptions })

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className={className}
        noValidate
      >
        {typeof children === 'function' ? children(methods) : children}
      </form>
    </FormProvider>
  )
}
