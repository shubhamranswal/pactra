import { BrowserRouter, Routes, Route } from "react-router-dom"

import Home from "./pages/Home"
import Dashboard from "./pages/Dashboard"
import CreateAgreement from "./pages/CreateAgreement"
import PactDetails from "./pages/PactDetails"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-agreement" element={<CreateAgreement />} />
        <Route path="/agreement/:id" element={<PactDetails />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App