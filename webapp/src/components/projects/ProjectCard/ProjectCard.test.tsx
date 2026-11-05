import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ProjectCard } from './ProjectCard'

afterEach(cleanup)
const project = { id: 'project-1', name: 'Preview Project', targetDomain: 'example.test', createdAt: '2026-01-01' }

describe('ProjectCard actions', () => {
  it('exposes project selection as a focusable native button', () => {
    const onSelect = vi.fn()
    render(<ProjectCard {...project} onSelect={onSelect} />)
    const button = screen.getByRole('button', { name: 'Open project Preview Project' })
    button.focus()
    expect(button).toHaveFocus()
    expect(button).toHaveAttribute('type', 'button')
    fireEvent.click(button)
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('keeps settings and delete actions separate from selection', () => {
    const onSelect = vi.fn()
    const onDelete = vi.fn()
    render(<ProjectCard {...project} onSelect={onSelect} onDelete={onDelete} />)
    const settings = screen.getByRole('link', { name: 'Project Settings' })
    expect(settings).toHaveAttribute('href', '/projects/project-1/settings')
    fireEvent.click(screen.getByRole('button', { name: 'Delete Project' }))
    expect(onDelete).toHaveBeenCalledOnce()
    expect(onSelect).not.toHaveBeenCalled()
    expect(settings.closest('button')).toBeNull()
  })

  it('does not offer an inert selection action without a callback', () => {
    render(<ProjectCard {...project} />)
    expect(screen.getByRole('heading', { name: 'Preview Project' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
