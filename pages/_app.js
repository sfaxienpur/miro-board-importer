import Head from "next/head";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <script src="https://miro.com/app/static/sdk/v2/miro.js" /> 
      </Head>
      <Component {...pageProps} />
    </>
  );
}
