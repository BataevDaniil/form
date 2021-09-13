import React, { useContext } from 'react'
import { useAtom } from '@reatom/react'

import {
  createForm,
  CreateFormParams,
  FieldConfig,
  FieldState,
  FieldValidator,
  FormState,
} from './form'
import { createAtom } from '@reatom/core'

type FieldInputProps<FieldValue> = {
  name: string
  onBlur: () => void
  onChange: (value: any) => void
  onFocus: () => void
  value: FieldValue
}
type FieldMetaState<FieldValue> = Pick<
  FieldState<FieldValue>,
  Exclude<keyof FieldState<FieldValue>, 'name' | 'value'>
>

export type FieldRenderProps<FieldValue> = {
  input: FieldInputProps<FieldValue>
  meta: FieldMetaState<FieldValue>
  [otherProp: string]: any
}

const mapStoreToFormState = (state: FormState<any, any>) => {
  return {
    initialValues: state.initialValues,
    valid: state.valid,
    invalid: state.invalid,
    values: state.values,
    pristine: state.pristine,
    submitting: state.submitting,
    validating: state.validating,
  }
}
export const useForm = () => {
  const form = useContext(Context)
  return {
    // TODO: need return submit promise
    submit: () => form.submit.dispatch(),
    getState: (): FormState<any, any> => mapStoreToFormState(form.getState()),
  }
}
export interface FormSubscription {
  subscription?: {
    submitting?: boolean
    initialValues?: boolean
    invalid?: boolean
    pristine?: boolean
    touched?: boolean
    valid?: boolean
    validating?: boolean
    values?: boolean
  }
}

export const useFormState = (
  config?: FormSubscription,
): Partial<FormState<any, any>> => {
  const form = useContext(Context)
  const [memo] = React.useState(() =>
    createAtom({ form }, ({ get }) => {
      const state = get('form')
      if (!config?.subscription) {
        return mapStoreToFormState(state)
      }
      return Object.fromEntries(
        // @ts-ignore
        Object.entries(state).filter(([name]) => config.subscription[name]),
      )
    }),
  )
  return useAtom(memo)[0]
}

export interface FieldSubscription {
  subscription?: {
    error?: boolean
    touched?: boolean
    validating?: boolean
    value?: boolean
  }
}

export const useField = (
  name: string,
  config?: FieldConfig & FieldSubscription,
): FieldRenderProps<any> => {
  const form = useContext(Context)
  // @ts-ignore
  if (form.getState().fields[name] === undefined) {
    form.addField.dispatch(name)
    if (config) {
      form.setConfig.dispatch(name, config)
    }
  }
  // @ts-ignore
  const [state, actions] = useAtom(form)

  // @ts-ignore
  const field = state.fields[name]

  // TODO: add
  // config?.subscription
  // TODO: add selectors
  return {
    input: {
      value: field.value,
      name,
      onBlur: () => actions.blur(name),
      onFocus: () => actions.focus(name),
      onChange: (value: any) => actions.change(name, value),
    },
    meta: {
      error: field.error,
      validating: field.validating,
      touched: field.touched,
    },
  }
}

export type FieldProps = {
  component: React.FC<FieldRenderProps<any>>
  name: string
} & { validate?: FieldValidator<any> }

export const Context = React.createContext(
  createForm({ onSubmit: () => {}, initialValues: {} }),
)

export const Form: React.FC<
  CreateFormParams & { debug?: boolean; createForm?: typeof createForm }
> = ({
  onSubmit,
  initialValues,
  children,
  createForm: createFormCertain = createForm,
  debug = false,
}) => {
  const submitMemo = React.useRef(onSubmit)
  submitMemo.current = onSubmit
  const [form] = React.useState(() =>
    createFormCertain({
      onSubmit: (values: object) => submitMemo.current(values),
      initialValues,
    }),
  )
  React.useEffect(() => {
    if (debug) {
      return form.subscribe(console.log)
    }
  }, [debug, form])
  return <Context.Provider value={form}>{children}</Context.Provider>
}

export const Field: React.FC<FieldProps & FieldSubscription> = ({
  name,
  component: Component,
  subscription,
  validate,
  ...props
}) => {
  const field = useField(name, {
    validate: validate ?? null,
    subscription,
  })
  return <Component {...field} {...props} />
}
