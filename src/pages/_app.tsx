import '../styles/global.scss'

function MyApp({
  Component,
  pageProps,
}: {
  Component: React.ElementType
  pageProps: any
}): JSX.Element {
  return <Component {...pageProps} />
}

export default MyApp
