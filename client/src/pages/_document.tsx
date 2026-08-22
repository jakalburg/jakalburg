import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&display=swap"
        />
        {/* Google Identity Services (One Tap + Sign in with Google button). */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://accounts.google.com/gsi/client" async defer />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
