import { configureStore } from '@reduxjs/toolkit'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import NotRequireAuth from './NotRequireAuth'

afterEach(cleanup)

const renderAuthRoutes = (isLoggedIn) => {
  const store = configureStore({
    reducer: {
      auth: () => ({ isLoggedIn }),
    },
  })

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<NotRequireAuth />}>
            <Route path="/login" element={<h1>Sign in</h1>} />
          </Route>
          <Route path="/dashboard" element={<h1>Dashboard</h1>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
}

describe('NotRequireAuth', () => {
  it('renders public routes when the visitor is signed out', () => {
    renderAuthRoutes(false)

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('redirects signed-in visitors to the dashboard', async () => {
    renderAuthRoutes(true)

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument()
    })
  })
})
