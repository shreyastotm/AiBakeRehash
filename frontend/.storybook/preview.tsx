import type { Preview } from '@storybook/react'
import type { ComponentType } from 'react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '../src/styles/globals.css'
// Initialize i18n so components using useLocalization render correctly
import '../src/i18n/config'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const preview: Preview = {
  decorators: [
    (Story: ComponentType) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(MemoryRouter, null, React.createElement(Story))
      ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      config: {},
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f9fafb' },
        { name: 'white', value: '#ffffff' },
        { name: 'dark', value: '#1f2937' },
      ],
    },
  },
}

export default preview
