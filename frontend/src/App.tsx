import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import ExamplePage from './pages/example'
import './App.css'

function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="mb-8">
          <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2D9CDB] to-[#56CCF2] shadow-2xl">
            <svg className="size-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="mb-4 text-5xl font-bold text-foreground">Welcome to Arctic UI</h1>
          <p className="mx-auto max-w-md text-lg text-muted-foreground">
            Experience a sleek, modern design system with Arctic Blue and Coral Red
          </p>
        </div>

        <Link
          to="/example"
          className="inline-flex h-12 items-center justify-center rounded-lg bg-gradient-to-r from-[#2D9CDB] to-[#56CCF2] px-8 py-3 text-base font-medium text-white shadow-lg transition-all hover:opacity-90 hover:scale-105 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D9CDB] focus-visible:ring-offset-2"
        >
          View Component Showcase
        </Link>
      </div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/example" element={<ExamplePage />} />
      </Routes>
    </Router>
  )
}

export default App
