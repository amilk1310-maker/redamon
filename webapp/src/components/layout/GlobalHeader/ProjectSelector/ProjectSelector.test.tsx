import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  useProjects: vi.fn(),
  useProject: vi.fn(),
  push: vi.fn(),
  pushUnguarded: vi.fn(),
  pathname: '/graph',
}))

vi.mock('@/hooks/useProjects', () => ({ useProjects: mocks.useProjects }))
vi.mock('@/providers/ProjectProvider', () => ({ useProject: mocks.useProject }))
vi.mock('@/context/NavigationGuardContext', () => ({
  useGuardedRouter: () => ({ push: mocks.push, pushUnguarded: mocks.pushUnguarded }),
  useNavigationGuard: () => null,
}))
vi.mock('next/navigation', () => ({ usePathname: () => mocks.pathname }))

import { ProjectSelector } from './ProjectSelector'

const project = {
  id: 'project-1',
  name: 'Acme project',
  targetDomain: 'example.test',
  description: null,
  subdomainList: [],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  userId: 'user-1',
  user: { id: 'user-1', name: 'Test User', email: 'test@example.test' },
}

function queryState(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn().mockResolvedValue({}),
    ...overrides,
  }
}

function openProjectMenu() {
  fireEvent.click(screen.getByTitle('Select Project'))
}

describe('ProjectSelector project query states', () => {
  beforeEach(() => {
    mocks.pathname = '/graph'
    mocks.push.mockReset()
    mocks.pushUnguarded.mockReset()
    mocks.useProject.mockReturnValue({
      currentProject: null,
      setCurrentProject: vi.fn(),
      userId: 'user-1',
    })
    mocks.useProjects.mockReturnValue(queryState())
  })

  afterEach(cleanup)

  test('shows a loading status instead of an empty state while loading', () => {
    mocks.useProjects.mockReturnValue(queryState({ isLoading: true }))
    render(<ProjectSelector />)
    openProjectMenu()

    expect(screen.getByRole('status')).toHaveTextContent('Loading projects...')
    expect(screen.queryByText('No projects yet')).not.toBeInTheDocument()
  })

  test('shows an error and retries, disabling retry while a request is active', () => {
    const failedQuery = queryState({ isError: true })
    mocks.useProjects.mockReturnValue(failedQuery)
    render(<ProjectSelector />)
    openProjectMenu()

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load projects')
    expect(screen.queryByText('No projects yet')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(failedQuery.refetch).toHaveBeenCalledOnce()

    mocks.useProjects.mockReturnValue(queryState({ isError: true, isFetching: true }))
    fireEvent.click(screen.getByTitle('Select Project'))
    openProjectMenu()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeDisabled()
  })

  test('shows the empty state after a successful empty response', () => {
    mocks.useProjects.mockReturnValue(queryState({ data: [] }))
    render(<ProjectSelector />)
    openProjectMenu()

    expect(screen.getByText('No projects yet')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  test('keeps cached projects visible alongside a fetch error', () => {
    mocks.useProjects.mockReturnValue(queryState({ data: [project], isError: true }))
    render(<ProjectSelector />)
    openProjectMenu()

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load projects')
    expect(screen.getByRole('button', { name: /Acme project/ })).toBeInTheDocument()
  })

  test('selects a project and closes the menu', () => {
    const setCurrentProject = vi.fn()
    mocks.useProject.mockReturnValue({ currentProject: null, setCurrentProject, userId: 'user-1' })
    mocks.useProjects.mockReturnValue(queryState({ data: [project] }))
    render(<ProjectSelector />)
    openProjectMenu()

    fireEvent.click(screen.getByRole('button', { name: /Acme project/ }))

    expect(setCurrentProject).toHaveBeenCalledWith({
      id: project.id,
      name: project.name,
      targetDomain: project.targetDomain,
      subdomainList: project.subdomainList,
      description: undefined,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    })
    expect(screen.queryByRole('button', { name: /Acme project/ })).not.toBeInTheDocument()
  })

  test('asks for a user even if the projects query is loading', () => {
    mocks.useProject.mockReturnValue({ currentProject: null, setCurrentProject: vi.fn(), userId: null })
    mocks.useProjects.mockReturnValue(queryState({ isLoading: true }))
    render(<ProjectSelector />)
    openProjectMenu()

    expect(screen.getByText('Select a user to view projects')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
