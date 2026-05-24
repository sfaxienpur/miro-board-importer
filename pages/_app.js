import Head from "next/head";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <script src="https://miro.com/app-sdk/v2.0/miro.js" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
