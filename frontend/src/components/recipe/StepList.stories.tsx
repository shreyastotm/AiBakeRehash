import type { Meta, StoryObj } from '@storybook/react'
import { StepList } from './StepList'
import type { RecipeSection, RecipeStep } from './StepList'

/**
 * `StepList` renders recipe instructions either as a flat numbered list or
 * grouped into labelled sections (Prep, Bake, Rest, etc.).
 *
 * **Accessibility notes:**
 * - Sections use `<section>` with `aria-labelledby` pointing to the section heading
 * - Steps are `<ol>` lists — screen readers announce step numbers
 * - Duration and temperature icons are `aria-hidden`; values are readable text
 */
const meta: Meta<typeof StepList> = {
  title: 'Recipe/StepList',
  component: StepList,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof StepList>

const flatSteps: RecipeStep[] = [
  { id: '1', instruction: 'Preheat oven to 180°C.', duration_seconds: 600, temperature_celsius: 180, position: 1 },
  { id: '2', instruction: 'Sift maida, cocoa powder, and baking soda together.', position: 2 },
  { id: '3', instruction: 'Cream butter and sugar until light and fluffy.', duration_seconds: 300, position: 3 },
  { id: '4', instruction: 'Fold dry ingredients into wet mixture gently.', position: 4 },
  { id: '5', instruction: 'Pour into greased tin and bake for 30 minutes.', duration_seconds: 1800, temperature_celsius: 180, position: 5 },
]

const sections: RecipeSection[] = [
  {
    id: 's1',
    title: 'Prep',
    type: 'prep',
    position: 1,
    steps: [
      { id: '1', instruction: 'Preheat oven to 180°C.', temperature_celsius: 180, position: 1 },
      { id: '2', instruction: 'Grease and line a 20cm round tin.', position: 2 },
    ],
  },
  {
    id: 's2',
    title: 'Bake',
    type: 'bake',
    position: 2,
    steps: [
      { id: '3', instruction: 'Pour batter into prepared tin.', position: 1 },
      { id: '4', instruction: 'Bake for 30–35 minutes until a skewer comes out clean.', duration_seconds: 2100, temperature_celsius: 180, position: 2 },
    ],
  },
  {
    id: 's3',
    title: 'Rest',
    type: 'rest',
    position: 3,
    steps: [
      { id: '5', instruction: 'Cool in tin for 10 minutes, then turn out onto a wire rack.', duration_seconds: 600, position: 1 },
    ],
  },
]

export const FlatSteps: Story = {
  args: { steps: flatSteps },
}

export const WithSections: Story = {
  args: { sections },
}

export const Empty: Story = {
  args: { steps: [] },
}
