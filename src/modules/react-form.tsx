import React, { useContext } from 'react'
import { useAction, useAtom } from '@reatom/react'

import { memo } from './memo'

import {
  createForm,
  CreateFormParams,
  FieldConfig,
  FieldState,
  FieldValidator,
  FormState,
} from './form'
import { createAtom } from '@reatom/core'
// @ts-ignore
import deepEqual from 'deep-equal'

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
  return React.useMemo(
    () => ({
      submit: () =>
        new Promise<undefined>((resolve) =>
          form.submit.dispatch(() => resolve(undefined)),
        ),
      getState: (): FormState<any, any> => mapStoreToFormState(form.getState()),
      change: form.change.dispatch,
      resetFieldState: (name: string) => form.reset.dispatch(name),
      getFieldState: (name: string) => mapFormToField(form.getState(), name),
    }),
    [form],
  )
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
  const formState = React.useMemo(
    () =>
      createAtom(
        { form },
        ({ get }) => {
          const state = get('form')
          if (!config?.subscription) {
            return mapStoreToFormState(state)
          }
          return Object.fromEntries(
            // @ts-ignore
            Object.entries(state).filter(([name]) => config.subscription[name]),
          )
        },
        { decorators: [memo()] },
      ),
    [form],
  )
  return useAtom(formState)[0]
}

export interface FieldSubscription {
  subscription?: {
    error?: boolean
    touched?: boolean
    validating?: boolean
    value?: boolean
  }
}

// @ts-ignore
const mapFormToField = (form, name: string) => {
  const field = form.fields[name]
  return {
    input: {
      value: field.value,
      name,
    },
    meta: {
      error: field.error,
      validating: field.validating,
      touched: field.touched,
    },
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
  const onBlur = useAction(() => form.blur(name), [name])
  const onFocus = useAction(() => form.focus(name), [name])
  const onChange = useAction((value: any) => form.change(name, value), [name])
  // @ts-ignore
  const newAtom = React.useMemo(() => {
    return createAtom(
      {
        form,
      },
      // @ts-ignore
      (
        { onAction, onChange, schedule, get },
        state = mapFormToField(get('form'), name),
      ) => {
        onChange('form', (newState, oldState) => {
          if (
            oldState === undefined ||
            !config?.subscription ||
            Object.keys(config.subscription).some(
              (prop) =>
                //@ts-ignore
                newState.fields[name][prop] !== oldState.fields[name][prop],
            )
          ) {
            state = mapFormToField(newState, name)
          }
        })

        return state
      },
      { decorators: [memo(deepEqual)] },
    )
  }, [form, name])

  const [state] = useAtom(newAtom)
  return React.useMemo(
    () => ({
      ...state,
      input: {
        ...state.input,
        onBlur,
        onFocus,
        onChange,
      },
    }),
    [state, onChange, onFocus, onFocus],
  )
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
