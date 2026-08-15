import type { AppProps } from "next/app";
import { Provider } from "react-redux";
import store from "@/redux/store";
import QueryProvider from "@/providers/query-provider";
import ErrorBoundary from "@/components/common/error-boundary";
import StoreDataSync from "@/components/common/store-data-sync";
import "@/styles/index.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryProvider>
      <Provider store={store}>
        <StoreDataSync />
        <div id="root">
          <ErrorBoundary>
            <Component {...pageProps} />
          </ErrorBoundary>
        </div>
      </Provider>
    </QueryProvider>
  );
}
