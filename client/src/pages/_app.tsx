import type { AppProps } from "next/app";
import { Provider } from "react-redux";
import store from "@/redux/store";
import QueryProvider from "@/providers/query-provider";
import ErrorBoundary from "@/components/common/error-boundary";
import StoreDataSync from "@/components/common/store-data-sync";
import AccountSync from "@/components/common/account-sync";
import { RouteLoader } from "@/components/common/route-loader";
import { AgentationDev } from "@/components/common/agentation-dev";
import "@/styles/index.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryProvider>
      <Provider store={store}>
        <StoreDataSync />
        <AccountSync />
        <RouteLoader />
        <div id="root">
          <ErrorBoundary>
            <Component {...pageProps} />
          </ErrorBoundary>
        </div>
        <AgentationDev />
      </Provider>
    </QueryProvider>
  );
}
