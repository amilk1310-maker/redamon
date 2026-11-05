import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  projects: { data: [] as { id: string; name: string; targetDomain: string; createdAt: string }[], isLoading: false, isError: false, isFetching: false, refetch: vi.fn() },
  users: { data: [{ id: 'user-1', name: 'Preview User', email: 'preview@example.test' }], isLoading: false, isError: false, isFetching: false, refetch: vi.fn() },
  setCurrentProject: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/providers/ProjectProvider', () => ({
  useProject: () => ({ userId: 'user-1', setUserId: vi.fn(), setCurrentProject: mocks.setCurrentProject }),
}))
vi.mock('@/hooks/useProjects', () => ({
  useProjects: () => mocks.projects,
  useDeleteProject: () => ({ isPending: false }),
}))
vi.mock('@/hooks/useUsers', () => ({
  useUsers: () => mocks.users,
  useCreateUser: () => ({ isPending: false }),
  useDeleteUser: () => ({ isPending: false }),
}))
vi.mock('@/components/ui', () => ({
  useAlertModal: () => ({}),
  useToast: () => ({}),
  WikiInfoButton: () => null,
}))
vi.mock('./ImportModal', () => ({ ImportModal: () => null }))

import ProjectsPage from './page'

beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(mocks.projects, { data: [], isLoading: false, isError: false, isFetching: false })
  Object.assign(mocks.users, { isLoading: false, isError: false, isFetching: false })
})
afterEach(cleanup)

describe('ProjectsPage query states', () => {
  it('shows an empty state only after a successful empty response', () => {
    render(<ProjectsPage />)
    expect(screen.getByText('No Projects Yet')).toBeInTheDocument()
  })

  it('announces initial loading without showing an empty state', () => {
    mocks.projects.isLoading = true
    render(<ProjectsPage />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading projects...')
    expect(screen.queryByText('No Projects Yet')).not.toBeInTheDocument()
  })

  it.each(['users', 'projects'] as const)('shows and retries a failed %s request', (query) => {
    mocks[query].isError = true
    render(<ProjectsPage />)
    expect(screen.getByRole('alert')).toHaveTextContent(`Unable to load ${query}`)
    expect(screen.queryByText('No Projects Yet')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(mocks[query].refetch).toHaveBeenCalledOnce()
    expect(mocks[query === 'users' ? 'projects' : 'users'].refetch).not.toHaveBeenCalled()
  })

  it('prevents duplicate retries while fetching', () => {
    Object.assign(mocks.projects, { isError: true, isFetching: true })
    render(<ProjectsPage />)
    expect(screen.getByRole('button', { name: 'Retry' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled()
  })

  it('refreshes both the users and projects lists', () => {
    render(<ProjectsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(mocks.users.refetch).toHaveBeenCalledOnce()
    expect(mocks.projects.refetch).toHaveBeenCalledOnce()
  })

  it('renders successful non-empty results', () => {
    mocks.projects.data = [{ id: 'project-1', name: 'Preview Project', targetDomain: 'example.test', createdAt: '2026-01-01' }]
    render(<ProjectsPage />)
    expect(screen.getByRole('button', { name: 'Open project Preview Project' })).toBeInTheDocument()
    expect(screen.queryByText('No Projects Yet')).not.toBeInTheDocument()
  })
})
