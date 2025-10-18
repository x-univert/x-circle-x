import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { DappProvider } from '@multiversx/sdk-dapp/wrappers/DappProvider'
import Home from './pages/Home'
import './App.css'

// Configuration MultiversX
const environment = 'devnet' // ou 'testnet' ou 'mainnet'

function App() {
  return (
    <Router>
      <DappProvider
        environment={environment}
        customNetworkConfig={{
          name: 'customConfig',
          apiTimeout: 6000,
          walletConnectV2ProjectId: '9b1a9564f91cb659ffe21b73d5c4e2d8'
        }}
      >
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </DappProvider>
    </Router>
  )
}

export default App
