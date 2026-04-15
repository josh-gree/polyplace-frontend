import argparse
import asyncio
import json
import random

import websockets
from websockets.exceptions import ConnectionClosed


GRID_SIZE = 1000
PALETTE = [
    "#e94f37",
    "#21a67a",
    "#2979c7",
    "#f2c84b",
    "#151515",
    "#c44569",
    "#00a6a6",
    "#ffffff",
]


def make_cell(rng: random.Random) -> str:
    return json.dumps(
        {
            "type": "cell",
            "x": rng.randrange(GRID_SIZE),
            "y": rng.randrange(GRID_SIZE),
            "color": rng.choice(PALETTE),
        },
        separators=(",", ":"),
    )


async def stream_cells(websocket, rate: int, seed: int) -> None:
    rng = random.Random(seed)
    delay = 1 / rate

    try:
        while True:
            await websocket.send(make_cell(rng))
            await asyncio.sleep(delay)
    except ConnectionClosed:
        return


async def main() -> None:
    parser = argparse.ArgumentParser(description="Stream random Polyplace cell updates over WebSocket.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--rate", type=int, default=1000, help="cells per second")
    parser.add_argument("--seed", type=int, default=20260416)
    args = parser.parse_args()

    async def handler(websocket):
        await stream_cells(websocket, args.rate, args.seed)

    async with websockets.serve(handler, args.host, args.port):
        print(f"Streaming {args.rate} cells/s at ws://{args.host}:{args.port}/ws", flush=True)
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
