import HomePage from '..'
import { render, screen } from '@testing-library/react'

test('Home Page', () => {
  render(<HomePage />)
  expect(screen.getByText('Welcome to Next.js!')).toBeInTheDocument()
})
