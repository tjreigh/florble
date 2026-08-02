# Florble

Florble is a word game made from strange little symbols.

It has two ways to play:

- **Daily** gives everyone the same hidden five-letter word. You get six guesses
  for the official score, then overtime keeps the puzzle going until you solve it.
- **Cipher** asks you to decode connected word ladders by working out which
  letter each symbol represents. Each puzzle includes a word bank and a few decoys.

Progress is saved in your browser. No account is required.

## Development

Requirements:

- Node.js 20.19 or newer
- Yarn 1.22

Install dependencies and start Florble locally:

```sh
yarn install
yarn start
```

Then open the local URL printed in the terminal.

Run the tests:

```sh
yarn test
```

Create a production build:

```sh
yarn build
```

Florble is built with TypeScript and Vite and is configured for Cloudflare Pages.

## Third-party content

The accepted-word dictionary incorporates data from the MIT-licensed
[`word-list`](https://github.com/sindresorhus/word-list) package. See
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for details.
