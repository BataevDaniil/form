import { createAtom } from '@reatom/core'

export type FieldValidator<FieldValue> = (
  value: FieldValue,
  // TODO: add
  // allValues: object,
  // meta?: FieldState<FieldValue>,
) => any | Promise<any>

export type FieldConfig = {
  validate: FieldValidator<any> | null
}
export type FieldState<FieldValue> = {
  name: string
  value: FieldValue
  error: string | null
  touched: boolean
  validating: boolean
}

export type FormState<FormValues, InitialFormValues = Partial<FormValues>> = {
  initialValues: InitialFormValues
  pristine: boolean
  submitting: boolean
  valid: boolean
  invalid: boolean
  validating: boolean
  values: FormValues
}

type SubmissionErrors = Record<string, any> | undefined
export type FormConfig<
  FormValues = object,
  InitialFormValues = Partial<FormValues>,
> = {
  initialValues?: InitialFormValues
  submit: (
    values: FormValues,
  ) => SubmissionErrors | Promise<SubmissionErrors> | void
}

const field: FieldState<any> & FieldConfig = {
  name: '',
  value: null,
  error: null,
  touched: false,
  validate: null,
  validating: false,
}
// @ts-ignore
const formInitial: FormState<any, any> &
  FormConfig & { fields: Record<string, FieldState<any> & FieldConfig> } = {
  submitting: false,
  fields: {},
}
export type CreateFormParams = {
  onSubmit: FormConfig['submit']
  initialValues: FormConfig['initialValues']
}

export const createForm = ({ onSubmit, initialValues }: CreateFormParams) => {
  const initial = { ...formInitial, submit: onSubmit, initialValues }
  return createAtom(
    {
      submit: () => {},
      blur: (name: string) => name,
      focus: (name: string) => name,
      change: (name: string, value: string) => ({ name, value }),
      addField: (name: string) => name,
      setConfig: (name: string, config: FieldConfig) => ({ name, config }),
      setConfigForm: (name: string, config: FormConfig) => ({ name, config }),
      _mergeField: (name: string, newField: Partial<FieldState<any>>) => ({
        name,
        newField,
      }),
      _mergeForm: (newForm: Partial<typeof formInitial>) => newForm,
    },
    ({ onAction, schedule, create }, state = initial) => {
      let newState = state

      const values = Object.fromEntries(
        Object.values(newState.fields).map(({ name, value }) => [name, value]),
      )
      const executeValidate = (
        name: string,
        validate: FieldValidator<any> | undefined,
        value: any,
      ) => {
        if (!validate) {
          return
        }
        schedule(async (dispatch) => {
          const actions = [
            create('_mergeField', name, {
              validating: false,
            }),
          ]
          try {
            dispatch(
              create('_mergeField', name, {
                validating: true,
              }),
            )
            actions.push(
              create('_mergeField', name, {
                error: await validate(value),
              }),
            )
          } finally {
            dispatch(actions)
          }
        })
      }
      onAction(`submit`, () => {
        schedule(async (dispatch) => {
          const actions = [
            create('_mergeForm', {
              submitting: false,
            }),
          ]
          try {
            dispatch(
              create('_mergeForm', {
                submitting: true,
              }),
            )
            dispatch(
              create('_mergeForm', {
                fields: Object.fromEntries(
                  Object.entries(newState.fields).map(([name, value]) => [
                    name,
                    { ...value, touched: true },
                  ]),
                ),
              }),
            )

            await newState.submit(values)
          } finally {
            dispatch(actions)
          }
        })
      })
      onAction(`setConfig`, ({ name, config }) => {
        if (config.validate) {
          // @ts-ignore
          executeValidate(name, config.validate, newState.fields[name].value)
        }
        newState = {
          ...newState,
          fields: {
            ...newState.fields,
            // @ts-ignore
            [name]: { ...newState.fields[name], ...config },
          },
        }
      })
      onAction(`addField`, (name) => {
        newState = {
          ...newState,
          fields: {
            ...newState.fields,
            // @ts-ignore
            [name]: { ...field, name, value: newState.initialValues?.[name] },
          },
        }
      })
      onAction('_mergeField', ({ name, newField }) => {
        newState = {
          ...newState,
          fields: {
            ...newState.fields,
            // @ts-ignore
            [name]: { ...newState.fields[name], ...newField },
          },
        }
      })
      onAction('_mergeForm', (newForm) => {
        newState = {
          ...newState,
          ...newForm,
        }
      })
      onAction('blur', (name) => {
        newState = {
          ...newState,
          fields: {
            ...newState.fields,
            // @ts-ignore
            [name]: { ...newState.fields[name], touched: true },
          },
        }
      })
      onAction('change', ({ name, value }) => {
        // @ts-ignore
        executeValidate(name, newState.fields[name].validate, value)
        newState = {
          ...newState,
          // @ts-ignore
          fields: {
            ...newState.fields,
            [name]: { ...newState.fields[name], value },
          },
        }
      })

      const invalid = Object.values(newState.fields).some(({ error }) => error)
      return {
        ...newState,
        valid: !invalid,
        invalid,
        pristine: Object.entries(values).some(
          ([name, value]) => state.fields[name].value !== value,
        ),
        validating: Object.values(state.fields).some(
          ({ validating }) => validating,
        ),
      }
    },
  )
}
