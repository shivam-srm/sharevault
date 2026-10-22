import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import axiosInstance from '../../config/axiosInstance'
import PublicAssistant from './PublicAssistant'

vi.mock('../../config/axiosInstance', () => ({
  default: { post: vi.fn() },
}))

afterEach(cleanup)

describe('PublicAssistant', () => {
  beforeEach(() => {
    axiosInstance.post.mockReset()
    axiosInstance.post.mockResolvedValue({ data: { message: 'Hello from the assistant.' } })
  })

  it('opens the chat and sends a suggested question', async () => {
    render(<PublicAssistant />)

    fireEvent.click(screen.getByRole('button', { name: 'Open Vault Assistant chat' }))
    fireEvent.click(screen.getByRole('button', { name: 'What is ShareVault?' }))

    await waitFor(() => {
      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/ai/public-chat',
        expect.objectContaining({ message: 'What is ShareVault?' }),
      )
    })
    expect(await screen.findByText('Hello from the assistant.')).toBeInTheDocument()
  })
})
