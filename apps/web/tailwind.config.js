/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#05984B',
          50: '#D4F4E2',
          100: '#C0EFD6',
          200: '#98E5BE',
          300: '#70DBA6',
          400: '#48D18E',
          500: '#05984B',
          600: '#047A3C',
          700: '#035C2D',
          800: '#023E1E',
          900: '#01200F',
        },
        secondary: {
          DEFAULT: '#0E8ECC',
          50: '#D3ECFA',
          100: '#BFE4F8',
          200: '#97D5F3',
          300: '#6FC6EE',
          400: '#47B7E9',
          500: '#0E8ECC',
          600: '#0B72A4',
          700: '#08567C',
          800: '#053A54',
          900: '#021E2C',
        },
        neutral: {
          DEFAULT: '#6F6E6D',
          light: '#787674',
        }
      },
    },
  },
  plugins: [],
}
