'use client'

import { useEffect, useState } from 'react'
import { useReown } from '@/lib/auth/ReownProvider'

interface UseAuthReturn {
  address: string | undefined
  isConnected: boolean
  isConnecting: boolean
  isAuthenticated: boolean
  login: () => void
  logout: () => void
}

/**
 * Custom hook for authentication
 * Wraps Reown provider with cleaner API and no Web3 jargon
 */
export function useAuth(): UseAuthReturn {
  const { address, isConnected, isConnecting, open, disconnect } = useReown()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const login = () => {
    open()
  }

  const logout = async () => {
    await disconnect()
  }

  return {
    address,
    isConnected: mounted && isConnected,
    isConnecting,
    isAuthenticated: mounted && isConnected && !!address,
    login,
    logout,
  }
}
