import { StrictMode, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useCurrentUser, useCashflows, useImportCashflow } from "@/hooks/use-items"
import { CashflowProvider } from "@/context/cashflow-context"
import { LoginPage } from "@/pages/login"
import { SharedCashflowPage } from "@/pages/shared-cashflow"
import { AnonymousApp } from "@/pages/anonymous-app"
import { getLocalCashflow, clearLocalCashflow, hasPendingImport, setPendingImport } from "@/lib/local-storage"
import App from "./App"
import "./index.css"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
})

function AuthenticatedApp() {
  const { data: cashflows = [], isLoading, refetch } = useCashflows()
  const importCashflow = useImportCashflow()
  const [pendingImport, setLocalPendingImport] = useState(() => hasPendingImport())

  useEffect(() => {
    if (pendingImport && !importCashflow.isPending) {
      const localCashflow = getLocalCashflow()
      if (localCashflow) {
        importCashflow.mutate(localCashflow, {
          onSuccess: async (importedCashflow) => {
            localStorage.setItem("cashflow_current_id", importedCashflow.id)
            clearLocalCashflow()
            setPendingImport(false)
            await refetch()
            setLocalPendingImport(false)
          },
          onError: async (error) => {
            console.error("Failed to import cashflow:", error)
            setPendingImport(false)
            await refetch()
            setLocalPendingImport(false)
          },
        })
      } else {
        setPendingImport(false)
        setLocalPendingImport(false)
      }
    }
  }, [pendingImport])

  if (isLoading || importCashflow.isPending || pendingImport) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">
          {importCashflow.isPending || pendingImport ? "Importing your cashflow..." : "Loading..."}
        </div>
      </div>
    )
  }

  return (
    <CashflowProvider cashflows={cashflows}>
      <App />
    </CashflowProvider>
  )
}

function MainRoute() {
  const { data: user, isLoading, isError } = useCurrentUser()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (isError || !user) {
    return <AnonymousApp />
  }

  return <AuthenticatedApp />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useCurrentUser()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route path="/s/:shareId" element={<SharedCashflowPage />} />
          <Route path="/*" element={<MainRoute />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)
