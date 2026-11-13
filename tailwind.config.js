export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F7F3EC', surface: '#FFFFFF', charcoal: '#1F1D1A', ink2: '#5C554C',
        brass: { DEFAULT: '#B8894A', hover: '#9C7239' }, line: '#E5DDD1',
        ok: '#4F7A52', danger: '#A64B3C',
      },
      fontFamily: { serif: ['Fraunces', 'serif'], sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
