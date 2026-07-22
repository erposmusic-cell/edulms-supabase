'use client'

import { create } from 'zustand'

export interface CurrentUser {
  id: string
  email: string
  name: string
  role: string
  phone?: string | null
  photoUrl?: string | null
  darkMode: boolean
}

interface AppState {
  currentUser: CurrentUser | null
  sidebarOpen: boolean
  authInitialized: boolean
  setCurrentUser: (user: CurrentUser | null) => void
  setSidebarOpen: (open: boolean) => void
  setAuthInitialized: (initialized: boolean) => void
  logout: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  sidebarOpen: false,
  authInitialized: false,
  setCurrentUser: (user) => set({ currentUser: user, authInitialized: true }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setAuthInitialized: (initialized) => set({ authInitialized: initialized }),
  logout: () => set({ currentUser: null, sidebarOpen: false }),
}))
