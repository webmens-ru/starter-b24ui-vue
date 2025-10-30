<script setup lang="ts">
import type { FormSubmitEvent } from '@bitrix24/b24ui-nuxt'
import { reactive } from 'vue'
import * as yup from 'yup'
import api from '../app/api'

const schema = yup.object({
  email: yup.string().email('Invalid email'),
  password: yup.string().min(8, 'Must be at least 8 characters')
})

type Schema = yup.InferType<typeof schema>

const state = reactive({
  email: '',
  password: ''
})

const toast = useToast()
async function onSubmit(event: FormSubmitEvent<Schema>) {
  console.log(event.data)
  try {
    await api.post('/send', event.data)
    toast.add({ title: 'Success', description: 'The form has been submitted.', color: 'air-primary-success' })
  } catch (error) {
    toast.add({ title: 'Ошибка', description: 'Ошибка при сабмите', color: 'air-primary-alert' })
  }

}

const showToast = () => {
  console.log('TOAST')
  toast.add({ title: 'Success', description: 'The form has been submitted.', color: 'air-primary-success' })
}
</script>

<template>
  <button @click="showToast">toast</button>
  <B24Form
    :schema="schema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit"
  >
    <B24FormField
      label="Email"
      name="email"
    >
      <B24Input v-model="state.email" />
    </B24FormField>

    <B24FormField
      label="Password"
      name="password"
    >
      <B24Input
        v-model="state.password"
        type="password"
      />
    </B24FormField>

    <B24Button
      color="air-primary"
      type="submit"
    >
      Submit
    </B24Button>
  </B24Form>
</template>

