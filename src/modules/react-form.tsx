import React, { useContext } from 'react'
import { useAtom } from '@reatom/react'

import {
  createForm,
  CreateFormParams,
  FieldConfig,
  FieldState,
  FieldValidator,
} from './form'

type FieldInputProps<FieldValue> = {
  name: string
  onBlur: (event?: React.FocusEvent<HTMLElement>) => void
  onChange: (event: React.ChangeEvent<HTMLElement> | any) => void
  onFocus: (event?: React.FocusEvent<HTMLElement>) => void
  value: FieldValue
  // type?: string
  // checked?: boolean
  // multiple?: boolean
}
type FieldMetaState<FieldValue> = Pick<
  FieldState<FieldValue>,
  Exclude<keyof FieldState<FieldValue>, 'name' | 'value'>
>

export type FieldRenderProps<FieldValue> = {
  input: FieldInputProps<FieldValue>
  meta: FieldMetaState<FieldValue>
}

export const useForm = () => {
  const form = useContext(Context)
  return {
    // TODO: need return submit promise
    submit: () => form.submit.dispatch(),
    getState: () => {
      const state = form.getState()
      return {
        pristine: state.pristine,
        submitting: state.submitting,
        validating: state.validating,
      }
    },
  }
}

export const useFormState = () => {
  const form = useContext(Context)
  return useAtom(form)[0]
}

// const getFieldByName = (name: string) => {
//   createAtom({ form }, ({ get }) => {
//     const field = get('form').fields[name]
//     return {
//       input: {
//         value: field.value,
//         name,
//         onBlur: () => form.blur.dispatch(name),
//         onFocus: () => form.focus.dispatch(name),
//         onChange: (value: any) => form.change.dispatch(name, value),
//       },
//       meta: {
//         error: field.error,
//         validating: field.validating,
//         touched: field.touched,
//       },
//     }
//   })
// }

export const useField = (
  name: string,
  config?: FieldConfig,
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

export const Form: React.FC<CreateFormParams & { debug?: boolean }> = ({
  onSubmit,
  initialValues,
  children,
  debug = false,
}) => {
  const [form] = React.useState(() => createForm({ onSubmit, initialValues }))
  React.useEffect(() => {
    if (debug) {
      return form.subscribe(console.log)
    }
  }, [debug, form])
  return <Context.Provider value={form}>{children}</Context.Provider>
}

export const Field: React.FC<FieldProps> = ({
  name,
  component: Component,
  ...props
}) => {
  const field = useField(name, { validate: props.validate ?? null })
  return <Component {...field} {...props} />
}
