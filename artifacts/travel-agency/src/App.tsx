import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AgencyProvider } from "@/hooks/use-agency";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";

import Dashboard from "@/pages/dashboard";
import ClientsList from "@/pages/clients/index";
import ClientDetail from "@/pages/clients/detail";
import DestinationsList from "@/pages/destinations/index";
import PackagesList from "@/pages/packages/index";
import BookingsList from "@/pages/bookings/index";
import BookingDetail from "@/pages/bookings/detail";
import PaymentsList from "@/pages/payments/index";
import DocumentsPage from "@/pages/documents/index";
import FinancePage from "@/pages/finance/index";
import SettingsPage from "@/pages/settings/index";
import EmployeesPage from "@/pages/employees/index";
import PurchaseOrdersPage from "@/pages/purchase-orders/index";
import SuppliersPage from "@/pages/suppliers/index";
import GroupsPage from "@/pages/groups/index";
import RemindersPage from "@/pages/reminders/index";
import CalendarPage from "@/pages/calendar/index";
import MessagesPage from "@/pages/messages/index";
import AnalyticsPage from "@/pages/analytics/index";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function ProtectedRouter() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/clients" component={ClientsList} />
        <Route path="/clients/:id" component={ClientDetail} />
        <Route path="/destinations" component={DestinationsList} />
        <Route path="/packages" component={PackagesList} />
        <Route path="/bookings" component={BookingsList} />
        <Route path="/bookings/:id" component={BookingDetail} />
        <Route path="/payments" component={PaymentsList} />
        <Route path="/documents" component={DocumentsPage} />
        <Route path="/finance" component={FinancePage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/employees" component={EmployeesPage} />
        <Route path="/purchase-orders" component={PurchaseOrdersPage} />
        <Route path="/suppliers" component={SuppliersPage} />
        <Route path="/groups" component={GroupsPage} />
        <Route path="/reminders" component={RemindersPage} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/messages" component={MessagesPage} />
        <Route path="/analytics" component={AnalyticsPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AgencyProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <ProtectedRouter />
            </WouterRouter>
            <Toaster />
          </AgencyProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
