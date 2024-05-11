# licheat

## Description

This is a simple program that helps you to cheat on lichess.org

## Installation

- Clone the repository
- [Install mitmproxy](https://docs.mitmproxy.org/stable/overview-installation/)
- [Install the certificates](https://docs.mitmproxy.org/stable/concepts-certificates/)
- Launch the proxy with `mitmproxy -s licheat.py`
- Set the HTTPS proxy in Firefox to `localhost:8080`
- [Install the extension in Firefox](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/)

## Usage

- Go to lichess.org
- Launch a game
- Bad moves cannot be played anymore
- You can play the best move by pressing `<Space>`

## Credits

- stockfish and nnue come from [nmrugg/stockfish.js](https://github.com/nmrugg/stockfish.js)
- `chess.js` comes from [jhlywa/chess.js](https://github.com/jhlywa/chess.js)

## License

The code that is not credited is distributed under the MIT license.
