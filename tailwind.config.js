/* eslint-disable @typescript-eslint/no-var-requires */
const { colors } = require('tailwindcss/defaultTheme')

module.exports = {
  future: {
    removeDeprecatedGapUtilities: true,
  },
  purge: [
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/pages/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          ...colors.gray,
          '100': '#fafafa',
          '300': '#dbdbdb',
          '600': '#999999',
          '700': '#666666',
          '800': '#333333',
          '900': '#111111',
        },
      },
    },
  },
  variants: {},
  plugins: [],
}
