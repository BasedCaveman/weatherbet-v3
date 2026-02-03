'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { BrowserProvider, JsonRpcSigner } from 'ethers'
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'

interface ReownContextType {
  address: string | undefined
  isConnected: boolean
  isConnecting: boolean
  provider: BrowserProvider | undefined
  signer: JsonRpcSigner | undefined
  open: () => void
  disconnect: () => void
}

const ReownContext = createContext<ReownContextType | undefined>(undefined)

export function ReownProvider({ children }: { children: ReactNode }) {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider('eip155')
  
  const [provider, setProvider] = useState<BrowserProvider | undefined>()
  const [signer, setSigner] = useState<JsonRpcSigner | undefined>()
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    const initProvider = async () => {
     if (walletProvider && isConnected) {
  try {
    const ethersProvider = new BrowserProvider(walletProvider as any)
          const ethersSigner = await ethersProvider.getSigner()
          setProvider(ethersProvider)
          setSigner(ethersSigner)
        } catch (error) {
          console.error('Failed to initialize provider:', error)
        }
      } else {
        setProvider(undefined)
        setSigner(undefined)
      }
    }

    initProvider()
  }, [walletProvider, isConnected])

  const disconnect = async () => {
    try {
      setIsConnecting(true)
      await open() // Reown handles disconnect through modal
    } catch (error) {
      console.error('Disconnect error:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const value: ReownContextType = {
    address,
    isConnected,
    isConnecting,
    provider,
    signer,
    open,
    disconnect,
  }

  return <ReownContext.Provider value={value}>{children}</ReownContext.Provider>
}

export function useReown() {
  const context = useContext(ReownContext)
  if (context === undefined) {
    throw new Error('useReown must be used within ReownProvider')
  }
  return context
}
