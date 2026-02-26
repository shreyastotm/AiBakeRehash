import type { Meta, StoryObj } from '@storybook/react'
import { ScalingControl } from './ScalingControl'

/**
 * `ScalingControl` lets users scale a recipe by target servings or yield weight.
 * It shows a live scaling factor and warns when the factor is extreme (>3× or <0.25×).
 *
 * **Accessibility notes:**
 * - Mode toggle uses `<fieldset>` / `<legend>` with `aria-pressed` on each button
 * - Warning message uses `role="alert"` for immediate screen-reader announcement
 * - Inputs are labelled with original values for context
 * - All interactive elements meet 44px minimum touch target
 */
const meta: Meta<typeof ScalingControl> = {
  title: 'Recipe/ScalingControl',
  component: ScalingControl,
  tags: ['autodocs'],
  argTypes: {
    originalServings: { control: { type: 'number', min: 1 } },
    originalYieldGrams: { control: { type: 'number', min: 1 } },
    loading: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof ScalingControl>

export const Default: Story = {
  args: {
    originalServings: 8,
    originalYieldGrams: 600,
    onScale: (factor: number) => console.log('Scale factor:', factor),
  },
}

export const Loading: Story = {
  args: {
    originalServings: 8,
    originalYieldGrams: 600,
    loading: true,
    onScale: () => {},
  },
}

export const SmallBatch: Story = {
  args: {
    originalServings: 24,
    originalYieldGrams: 1200,
    onScale: () => {},
  },
}
