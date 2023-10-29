import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// const nodeExternals = require('webpack-node-externals');
import CopyPlugin from 'copy-webpack-plugin';

export default {
  entry: './part1/src/main.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.wgsl$/,
        type: 'asset/source',
      },
    ],
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    extensionAlias: {
      '.js': ['.js', '.ts'],
    },
    fallback: {
      fs: false,
    },
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  devServer: {
    static: path.join(__dirname, 'dist'),
    compress: true,
    port: 1234,
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: 'part1/src/index.html', to: 'index.html', toType: 'file' }],
    }),
  ],
};
