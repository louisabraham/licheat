import(browser.runtime.getURL("./chess.js")).then((module) => {
    Chess = module.Chess;

    const worker = new Worker(
        browser.runtime.getURL("stockfish-nnue-16-single.js")
    );
    worker.postMessage("uci");
    worker.postMessage("setoption name Use NNUE value true");
    worker.postMessage("ucinewgame");

    worker.locked = false;

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const engine = async (pgn, depth = 7) => {
        if (pgn == "") {
            return { bestmove: undefined, cp: 0 };
        }
        while (worker.locked) {
            await sleep(100);
        }
        let chess = new Chess();
        chess.loadPgn(pgn);
        if (chess.isGameOver()) {
            return {
                bestmove: undefined,
                cp: 10000 * (chess.turn() == player ? -1 : 1),
            };
        }
        worker.locked = true;
        worker.postMessage("position fen " + chess.fen());
        let cp = undefined;
        let bestmove = undefined;
        worker.onmessage = function (event) {
            // console.log(event.data);
            if (event.data.startsWith("bestmove")) {
                let m = event.data.split(" ")[1];
                bestmove = {
                    from: m.slice(0, 2),
                    to: m.slice(2),
                };
                if (m.length > 4) {
                    bestmove.promotion = m[4];
                }
                return;
            }
            if (event.data.startsWith("info depth " + depth)) {
                if (event.data.includes("mate"))
                    cp = 10000 * (event.data.includes("mate -") ? -1 : 1);
                else cp = parseInt(event.data.match(/score cp (-?\d+)/)[1]);
            }
        };
        worker.postMessage("go depth " + depth);
        while (bestmove == undefined) {
            await sleep(100);
        }
        worker.locked = false;
        if (chess.turn() != player) {
            cp = -cp;
        }

        return { bestmove, cp };
    };

    const board = document.getElementsByTagName("cg-board")[0];
    const unit = () => board.clientHeight / 8;

    const getPlayer = () => {
        let clocks = document.getElementsByClassName("rclock");
        if (!clocks.length) {
            return null;
        }
        let player_clock = clocks[1];
        if (player_clock.classList.contains("rclock-white")) return "w";
        else return "b";
    };
    const player = getPlayer();

    const squareName = (x, y) => {
        if (player == "b") {
            x = 7 - x;
            y = 7 - y;
        }
        return String.fromCharCode(97 + x) + (y + 1);
    };
    const getCoords = (el) => {
        const transform = el.style.transform;
        const coords = transform.match(/\d+(\.\d+)?/g);
        while (coords.length < 2) {
            coords.push("0");
        }
        [x, y] = coords.map((coord) => Math.round(parseFloat(coord) / unit()));
        return [x, 7 - y];
    };

    const getPGN = () => {
        let moves = document.getElementsByTagName("kwdb");
        pgn = "";
        for (let i = 0; i < moves.length; i++) {
            if (i % 2 == 0) {
                pgn += i / 2 + 1 + ". ";
            }
            pgn += moves[i].innerText + " ";
        }
        return pgn;
    };
    let curPGN;
    let bestCP;
    let curBest;

    const update = async () => {
        let buttons = document.getElementsByClassName("buttons")[0];
        if (!buttons.children[3].disabled) return;
        const pgn = getPGN();
        if (pgn == curPGN) {
            return;
        }
        if (
            document.getElementsByTagName("kwdb").length % 2 !=
            (player == "w" ? 0 : 1)
        ) {
            return;
        }
        let bestmove = (await engine(pgn)).bestmove;
        if (bestmove == undefined) {
            curPGN = pgn;
            bestCP = 0;
            return;
        }
        let chess = new Chess();
        chess.loadPgn(pgn);
        chess.move(bestmove);
        curPGN = pgn;
        bestCP = (await engine(chess.pgn())).cp;
        curBest = bestmove;
        console.log("best move", curBest);
        console.log("best move evaluation", bestCP);
    };
    const updateLoop = async () => {
        while (getPlayer() != null) {
            await update();
            await sleep(100);
        }
    };
    updateLoop();

    let selected;
    let allow = false;
    board.addEventListener(
        "mousedown",
        async (e) => {
            if (getPlayer() == null) return;
            if (e.target == board) {
                x = Math.floor(e.layerX / unit());
                y = 7 - Math.floor(e.layerY / unit());
                selected = squareName(x, y);
            } else {
                if (allow) {
                    allow = false;
                    return;
                } else {
                    e.stopPropagation();
                }
                let dest = squareName(...getCoords(e.target));
                let move = { from: selected, to: dest };
                let pgn = getPGN();

                let chess = new Chess();
                chess.loadPgn(pgn);
                if (chess.get(move.from).type == "p") {
                    if (
                        (player == "w" && move.to[1] == "8") ||
                        (player == "b" && move.to[1] == "1")
                    ) {
                        move.promotion = "q";
                    }
                }
                chess.move(move);

                let moveCP = (await engine(chess.pgn())).cp;
                console.log("move", move);
                console.log("move evaluation", moveCP);
                if (
                    moveCP > 500 ||
                    moveCP > bestCP - (bestCP >= 0 ? 50 : 20) ||
                    JSON.stringify(move) == JSON.stringify(curBest)
                ) {
                    allow = true;
                    let newEvent = new MouseEvent("mousedown", e);
                    e.target.dispatchEvent(newEvent);
                }
            }
        },
        true
    );

    const clickSquare = async (square) => {
        let x = square.charCodeAt(0) - 97;
        let y = parseInt(square[1]) - 1;
        if (player == "b") {
            x = 7 - x;
            y = 7 - y;
        }

        let layerX = x * unit() + unit() / 2;
        let layerY = (7 - y) * unit() + unit() / 2;
        rect = board.getBoundingClientRect();
        let newEvent = new MouseEvent("mousedown", {
            bubbles: true,
            cancelable: true,
            clientX: layerX + rect.left,
            clientY: layerY + rect.top,
            buttons: 1,
        });
        board.dispatchEvent(newEvent);
        await sleep(100);
        newEvent = new MouseEvent("mouseup", {
            bubbles: true,
            cancelable: true,
            clientX: layerX + rect.left,
            clientY: layerY + rect.top,
            buttons: 1,
        });
        board.dispatchEvent(newEvent);
    };
    document.addEventListener("keydown", async (e) => {
        if (getPlayer() == null) return;
        if (document.activeElement.tagName != "BODY") return;
        if (e.code == "Space") {
            e.preventDefault();
            let { from, to } = curBest;
            clickSquare(from);
            await sleep(500);
            clickSquare(to);
        }
    });
});
