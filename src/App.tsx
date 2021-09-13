import React from 'react'

import {
  Field,
  FieldRenderProps,
  Form,
  useForm,
  useFormState,
} from './modules/react-form'

const delay = (timeout: number) =>
  new Promise((resolve) => setTimeout(resolve, timeout))
const Input: React.FC<FieldRenderProps<any>> = ({
  input: { onChange, ...input },
  meta: { touched, error, validating },
}) => {
  return (
    <div>
      <input onChange={(event) => onChange(event.target.value)} {...input} />
      {touched && error && <div style={{ background: 'red' }}>{error}</div>}
      {validating && 'validating'}
    </div>
  )
}

const required = (value: string) => (value === '' ? 'Заполните поле' : null)

const Footer = () => {
  const form = useForm()
  const { submitting } = useFormState({ subscription: { submitting: true } })
  console.log('render', submitting)

  return (
    <div>
      <button
        onClick={() => {
          form.submit()
        }}
      >
        submit
      </button>
      {submitting && 'submitting'}
    </div>
  )
}

function App() {
  return (
    <>
      <Form
        onSubmit={async () => {
          console.log('submit one form')
          await delay(2000)
        }}
        initialValues={{ field1: 'asdf' }}
      >
        <Field name="field1" validate={required} component={Input} />
        <Field
          name="field2"
          subscription={{ value: true }}
          validate={(value) => delay(2000).then(() => required(value))}
          component={Input}
        />

        <Footer />
      </Form>
      <Form
        onSubmit={async () => {
          console.log('submit two form')
          await delay(2000)
        }}
        initialValues={{ field2: 'asdf' }}
      >
        <Field
          name="field1"
          subscription={{ value: true }}
          validate={required}
          component={Input}
        />
        <Field
          name="field2"
          validate={(value) => delay(2000).then(() => required(value))}
          component={Input}
        />
        <Footer />
      </Form>
    </>
  )
}

export default App
