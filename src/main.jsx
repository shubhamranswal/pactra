import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Web3Provider from './web3/Web3Provider'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Web3Provider>
      <App />
    </Web3Provider>
  </StrictMode>,
)

