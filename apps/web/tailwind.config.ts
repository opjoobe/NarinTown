import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        narin: {
          green: '#00C73C', // 네이버 그린 계열
          ink: '#1A1A1A',
          paper: '#F7F7F4',
        },
      },
      fontFamily: {
        pixel: ['"DungGeunMo"', '"Press Start 2P"', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
